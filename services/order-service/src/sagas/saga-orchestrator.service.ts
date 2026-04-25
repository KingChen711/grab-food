import type { CancellationReason } from '@grab/types'
import { InjectQueue } from '@nestjs/bull'
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'
import { InjectModel } from '@nestjs/mongoose'
import type { Queue } from 'bull'
import { randomUUID } from 'crypto'
import type { Model } from 'mongoose'

import type { OrderCreatedEvent } from '../orders/domain/events/order-created.event'
import type { OrdersService } from '../orders/orders.service'
import type { SagaContext, SagaReply, SagaTimeoutJobData } from './interfaces/saga.interfaces'
import { RabbitMQService } from './rabbitmq.service'
import {
  INTERNAL_STEPS,
  SAGA_QUEUES,
  SAGA_STEP_NAMES,
  SAGA_STEP_SEQUENCE,
  SAGA_STEP_TIMEOUT_MS,
  SAGA_TIMEOUT_JOB,
  SAGA_TIMEOUT_QUEUE,
  type SagaStepName,
} from './saga.constants'
import { SagaStateDocument } from './schemas/saga-state.schema'
import { AssignDriverStep } from './steps/assign-driver.step'
import { ConfirmOrderStep } from './steps/confirm-order.step'
import { ProcessPaymentStep } from './steps/process-payment.step'
import { ReserveInventoryStep } from './steps/reserve-inventory.step'
import { ValidateRestaurantStep } from './steps/validate-restaurant.step'

// Lazy injection to avoid circular dependency (OrdersModule ↔ SagaModule)
export const ORDERS_SERVICE_TOKEN = 'ORDERS_SERVICE_FOR_SAGA'

@Injectable()
export class SagaOrchestratorService implements OnModuleInit {
  private readonly logger = new Logger(SagaOrchestratorService.name)

  constructor(
    @InjectModel(SagaStateDocument.name)
    private readonly sagaModel: Model<SagaStateDocument>,
    private readonly rabbitMQ: RabbitMQService,
    @InjectQueue(SAGA_TIMEOUT_QUEUE) private readonly timeoutQueue: Queue<SagaTimeoutJobData>,
    // Injected via custom token to break the circular dependency with OrdersModule
    @Inject(ORDERS_SERVICE_TOKEN) private readonly ordersService: OrdersService,
  ) {}

  // ─── Bootstrap: start consuming replies ──────────────────────────────────

  public async onModuleInit(): Promise<void> {
    await this.rabbitMQ.consume(SAGA_QUEUES.REPLIES, (msg) => this.handleReply(msg as SagaReply))
    this.logger.log('Saga reply consumer started')
  }

  // ─── Entry point: triggered by OrderCreated domain event ─────────────────

  @OnEvent('OrderCreated')
  public async startSaga(event: OrderCreatedEvent): Promise<void> {
    const sagaId = randomUUID()

    const context: SagaContext = {
      sagaId,
      orderId: event.orderId,
      customerId: event.customerId,
      restaurantId: event.restaurantId,
      restaurantName: event.restaurantName,
      items: event.items.map((i) => ({
        menuItemId: i.menuItemId,
        menuItemName: i.menuItemName,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
      })),
      subtotal: event.subtotal,
      deliveryFee: event.deliveryFee,
      tax: event.tax,
      total: event.total,
      deliveryAddress: {
        address: event.deliveryAddress.address,
        lat: event.deliveryAddress.lat,
        lng: event.deliveryAddress.lng,
        notes: event.deliveryAddress.notes,
      },
      notes: event.notes,
    }

    await this.sagaModel.create({
      sagaId,
      orderId: event.orderId,
      status: 'PENDING',
      completedSteps: [],
      context,
      startedAt: new Date(),
    })

    this.logger.log(`Saga ${sagaId} created for order ${event.orderId}`)
    await this.executeStep(sagaId, SAGA_STEP_SEQUENCE[0])
  }

  // ─── Reply handler (called from RabbitMQ consumer) ────────────────────────

  public async handleReply(reply: SagaReply): Promise<void> {
    const saga = await this.sagaModel.findOne({ sagaId: reply.sagaId }).lean().exec()

    if (!saga) {
      this.logger.warn(`Received reply for unknown saga ${reply.sagaId}`)
      return
    }
    if (saga.status !== 'RUNNING') {
      this.logger.warn(`Ignoring reply for saga ${reply.sagaId} with status ${saga.status}`)
      return
    }
    if (saga.currentStep !== reply.stepName) {
      this.logger.warn(
        `Stale reply for saga ${reply.sagaId}: expected step "${saga.currentStep}", got "${reply.stepName}"`,
      )
      return
    }

    // Cancel the active timeout job
    await this.cancelTimeoutJob(saga.sagaId, saga.timeoutJobId)

    if (reply.success) {
      await this.onStepSuccess(reply.sagaId, reply.stepName, reply.data ?? {})
    } else {
      await this.onStepFailure(reply.sagaId, reply.stepName, reply.error ?? 'Unknown error')
    }
  }

  // ─── Timeout handler (called from BullMQ processor) ──────────────────────

  public async handleTimeout(sagaId: string, stepName: SagaStepName): Promise<void> {
    const saga = await this.sagaModel.findOne({ sagaId }).lean().exec()

    if (!saga || saga.status !== 'RUNNING' || saga.currentStep !== stepName) return

    this.logger.warn(`Saga ${sagaId} step "${stepName}" timed out after ${SAGA_STEP_TIMEOUT_MS}ms`)
    await this.onStepFailure(sagaId, stepName, `Step "${stepName}" timed out`)
  }

  // ─── Step execution ───────────────────────────────────────────────────────

  private async executeStep(sagaId: string, stepName: SagaStepName): Promise<void> {
    const saga = await this.sagaModel
      .findOneAndUpdate({ sagaId }, { status: 'RUNNING', currentStep: stepName }, { new: true })
      .lean()
      .exec()

    if (!saga) return

    this.logger.log(`Saga ${sagaId}: executing step "${stepName}"`)

    if (INTERNAL_STEPS.has(stepName)) {
      await this.executeInternalStep(sagaId, stepName, saga.context)
    } else {
      await this.executeExternalStep(sagaId, stepName, saga.context)
    }
  }

  private async executeExternalStep(
    sagaId: string,
    stepName: SagaStepName,
    ctx: SagaContext,
  ): Promise<void> {
    const command = this.buildCommand(stepName, ctx)
    const queue = this.getCommandQueue(stepName)
    this.rabbitMQ.publish(queue, command)

    // Enqueue timeout job
    const job = await this.timeoutQueue.add(
      SAGA_TIMEOUT_JOB,
      { sagaId, stepName },
      { delay: SAGA_STEP_TIMEOUT_MS, removeOnComplete: true },
    )
    await this.sagaModel.updateOne({ sagaId }, { timeoutJobId: String(job.id) })
  }

  private async executeInternalStep(
    sagaId: string,
    stepName: SagaStepName,
    ctx: SagaContext,
  ): Promise<void> {
    try {
      if (stepName === SAGA_STEP_NAMES.CONFIRM_ORDER) {
        await ConfirmOrderStep.execute(ctx, this.ordersService)
      }
      await this.onStepSuccess(sagaId, stepName, {})
    } catch (err) {
      await this.onStepFailure(sagaId, stepName, String(err))
    }
  }

  // ─── Step outcome handlers ────────────────────────────────────────────────

  private async onStepSuccess(
    sagaId: string,
    stepName: SagaStepName,
    data: Partial<SagaContext>,
  ): Promise<void> {
    const saga = await this.sagaModel.findOne({ sagaId }).lean().exec()
    if (!saga) return

    const completedSteps = [...saga.completedSteps, stepName]
    const updatedContext: SagaContext = { ...saga.context, ...data }

    const nextStep = this.getNextStep(stepName)

    if (!nextStep) {
      // All steps completed
      await this.sagaModel.updateOne(
        { sagaId },
        {
          status: 'COMPLETED',
          completedSteps,
          context: updatedContext,
          completedAt: new Date(),
          currentStep: undefined,
          timeoutJobId: undefined,
        },
      )
      this.logger.log(`Saga ${sagaId} COMPLETED for order ${saga.orderId}`)
      return
    }

    await this.sagaModel.updateOne({ sagaId }, { completedSteps, context: updatedContext })
    await this.executeStep(sagaId, nextStep)
  }

  private async onStepFailure(
    sagaId: string,
    stepName: SagaStepName,
    error: string,
  ): Promise<void> {
    this.logger.error(`Saga ${sagaId} step "${stepName}" failed: ${error}`)

    await this.sagaModel.updateOne({ sagaId }, { status: 'COMPENSATING', error })
    await this.runCompensation(sagaId)
  }

  // ─── Compensation ─────────────────────────────────────────────────────────

  private async runCompensation(sagaId: string): Promise<void> {
    const saga = await this.sagaModel.findOne({ sagaId }).lean().exec()
    if (!saga) return

    this.logger.log(
      `Saga ${sagaId}: compensating steps [${[...saga.completedSteps].reverse().join(', ')}]`,
    )

    // Publish compensation commands in reverse order (fire-and-forget)
    for (const stepName of [...saga.completedSteps].reverse() as SagaStepName[]) {
      const cmd = this.buildCompensationCommand(stepName, saga.context)
      const queue = this.getCompensationQueue(stepName)
      if (cmd && queue) {
        this.rabbitMQ.publish(queue, cmd)
      }
    }

    // Cancel the order aggregate
    const reason = this.mapErrorToReason(saga.error)
    try {
      await this.ordersService.cancel(saga.orderId, {
        reason,
        cancelledBy: 'system',
        note: saga.error,
      })
    } catch (err) {
      // Order may already be cancelled or in a non-cancellable state
      this.logger.warn(`Could not cancel order ${saga.orderId} during compensation: ${String(err)}`)
    }

    await this.sagaModel.updateOne(
      { sagaId },
      {
        status: 'FAILED',
        completedAt: new Date(),
        currentStep: undefined,
        timeoutJobId: undefined,
      },
    )

    this.logger.log(`Saga ${sagaId} FAILED — compensation published`)
  }

  // ─── Command builders ─────────────────────────────────────────────────────

  private buildCommand(stepName: SagaStepName, ctx: SagaContext): unknown {
    switch (stepName) {
      case SAGA_STEP_NAMES.VALIDATE_RESTAURANT:
        return ValidateRestaurantStep.buildCommand(ctx)
      case SAGA_STEP_NAMES.RESERVE_INVENTORY:
        return ReserveInventoryStep.buildCommand(ctx)
      case SAGA_STEP_NAMES.PROCESS_PAYMENT:
        return ProcessPaymentStep.buildCommand(ctx)
      case SAGA_STEP_NAMES.ASSIGN_DRIVER:
        return AssignDriverStep.buildCommand(ctx)
      default:
        return null
    }
  }

  private buildCompensationCommand(stepName: SagaStepName, ctx: SagaContext): unknown {
    switch (stepName) {
      case SAGA_STEP_NAMES.VALIDATE_RESTAURANT:
        return ValidateRestaurantStep.buildCompensationCommand(ctx)
      case SAGA_STEP_NAMES.RESERVE_INVENTORY:
        return ReserveInventoryStep.buildCompensationCommand(ctx)
      case SAGA_STEP_NAMES.PROCESS_PAYMENT:
        return ProcessPaymentStep.buildCompensationCommand(ctx)
      case SAGA_STEP_NAMES.ASSIGN_DRIVER:
        return AssignDriverStep.buildCompensationCommand(ctx)
      default:
        return null
    }
  }

  private getCommandQueue(stepName: SagaStepName): string {
    const map: Partial<Record<SagaStepName, string>> = {
      [SAGA_STEP_NAMES.VALIDATE_RESTAURANT]: SAGA_QUEUES.COMMANDS.VALIDATE_RESTAURANT,
      [SAGA_STEP_NAMES.RESERVE_INVENTORY]: SAGA_QUEUES.COMMANDS.RESERVE_INVENTORY,
      [SAGA_STEP_NAMES.PROCESS_PAYMENT]: SAGA_QUEUES.COMMANDS.PROCESS_PAYMENT,
      [SAGA_STEP_NAMES.ASSIGN_DRIVER]: SAGA_QUEUES.COMMANDS.ASSIGN_DRIVER,
    }
    return map[stepName] ?? ''
  }

  private getCompensationQueue(stepName: SagaStepName): string | null {
    const map: Partial<Record<SagaStepName, string>> = {
      [SAGA_STEP_NAMES.VALIDATE_RESTAURANT]: SAGA_QUEUES.COMMANDS.NOTIFY_RESTAURANT_CANCELLED,
      [SAGA_STEP_NAMES.RESERVE_INVENTORY]: SAGA_QUEUES.COMMANDS.RELEASE_INVENTORY,
      [SAGA_STEP_NAMES.PROCESS_PAYMENT]: SAGA_QUEUES.COMMANDS.REFUND_PAYMENT,
      [SAGA_STEP_NAMES.ASSIGN_DRIVER]: SAGA_QUEUES.COMMANDS.UNASSIGN_DRIVER,
    }
    return map[stepName] ?? null
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private getNextStep(current: SagaStepName): SagaStepName | null {
    const idx = SAGA_STEP_SEQUENCE.indexOf(current)
    return idx >= 0 && idx < SAGA_STEP_SEQUENCE.length - 1
      ? (SAGA_STEP_SEQUENCE[idx + 1] ?? null)
      : null
  }

  private async cancelTimeoutJob(sagaId: string, jobId?: string): Promise<void> {
    if (!jobId) return
    try {
      const job = await this.timeoutQueue.getJob(jobId)
      if (job) await job.remove()
    } catch {
      this.logger.debug(`Could not remove timeout job ${jobId} for saga ${sagaId}`)
    }
  }

  private mapErrorToReason(error?: string): CancellationReason {
    if (!error) return 'system_error'
    if (error.includes('timed out')) return 'system_error'
    if (error.includes('payment')) return 'payment_failed'
    if (error.includes('driver')) return 'driver_not_found'
    if (error.includes('item') || error.includes('inventory')) return 'item_unavailable'
    if (error.includes('restaurant') || error.includes('closed')) return 'restaurant_closed'
    return 'system_error'
  }
}
