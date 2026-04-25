import type { SagaCommand, SagaContext } from '../interfaces/saga.interfaces'
import { SAGA_QUEUES, SAGA_STEP_NAMES } from '../saga.constants'

export interface ProcessPaymentCommand extends SagaCommand {
  customerId: string
  amount: number
  currency: string
  idempotencyKey: string
}

export interface RefundPaymentCommand extends SagaCommand {
  paymentIntentId: string
  amount: number
  reason: string
}

/**
 * Step 3 — ProcessPayment
 *
 * Asks payment-service to charge the customer. The command includes an
 * idempotency key (`order:{orderId}`) so retries are safe. The reply
 * includes a `paymentIntentId` stored in saga context for compensation.
 *
 * Compensation: refunds the charge via payment-service.
 */
export class ProcessPaymentStep {
  static readonly NAME = SAGA_STEP_NAMES.PROCESS_PAYMENT
  static readonly COMMAND_QUEUE = SAGA_QUEUES.COMMANDS.PROCESS_PAYMENT
  static readonly COMPENSATION_QUEUE = SAGA_QUEUES.COMMANDS.REFUND_PAYMENT

  static buildCommand(ctx: SagaContext): ProcessPaymentCommand {
    return {
      sagaId: ctx.sagaId,
      stepName: this.NAME,
      orderId: ctx.orderId,
      customerId: ctx.customerId,
      amount: ctx.total,
      currency: 'VND',
      idempotencyKey: `order:${ctx.orderId}`,
    }
  }

  static buildCompensationCommand(ctx: SagaContext): RefundPaymentCommand | null {
    if (!ctx.paymentIntentId) return null
    return {
      sagaId: ctx.sagaId,
      stepName: this.NAME,
      orderId: ctx.orderId,
      paymentIntentId: ctx.paymentIntentId,
      amount: ctx.total,
      reason: 'Order fulfilment saga failed — automatic refund',
    }
  }
}
