import { BadRequestException, Injectable, Logger } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { IdempotencyService } from '../idempotency/idempotency.service'
import { StripeService } from '../stripe/stripe.service'
import { CreatePaymentInput } from './dtos/create-payment.dto'
import { Payment } from './entities/payment.entity'
import { assertCanTransition } from './payment.state-machine'

/** Methods this service can fulfil today. wallet → Task 10; momo/zalopay are out of scope. */
const SUPPORTED_METHODS = new Set<CreatePaymentInput['method']>(['card', 'cash_on_delivery'])

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name)

  constructor(
    private readonly idempotencyService: IdempotencyService,
    private readonly stripeService: StripeService,
    private readonly eventEmitter: EventEmitter2,
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
  ) {}

  /**
   * Create a payment and drive its state machine. Idempotent on `idempotencyKey`:
   * a replay returns the stored payment instead of charging again.
   *
   *   card             → create a Stripe PaymentIntent, move PENDING → PROCESSING.
   *                      The terminal SUCCEEDED/FAILED arrives later via webhook (Task 6).
   *   cash_on_delivery → stay PENDING (settled on delivery).
   *   wallet           → debit the wallet and SUCCEEDED (Task 10 — not wired yet).
   */
  public async createPayment(userId: string, dto: CreatePaymentInput): Promise<Payment> {
    // 1. Idempotent replay — return the previously stored payment untouched.
    const cached = await this.idempotencyService.check(dto.idempotencyKey)
    if (cached) {
      this.logger.debug(`Idempotent replay for key ${dto.idempotencyKey}`)
      return cached
    }

    // 2. Reject methods we can't fulfil yet, before touching the DB or Stripe.
    if (!SUPPORTED_METHODS.has(dto.method)) {
      throw new BadRequestException(`Payment method "${dto.method}" is not supported yet`)
    }

    // 3. Persist a PENDING payment so we have an id to attach to the PaymentIntent.
    const payment = await this.paymentRepo.save(
      this.paymentRepo.create({
        orderId: dto.orderId,
        userId,
        amount: dto.amount,
        currency: dto.currency,
        method: dto.method,
        idempotencyKey: dto.idempotencyKey,
        status: 'PENDING',
      }),
    )

    // 4. Drive the state machine per method.
    if (dto.method === 'card') {
      const intent = await this.stripeService.createPaymentIntent({
        amount: payment.amount,
        currency: payment.currency.toLowerCase(),
        paymentMethodId: dto.paymentMethodId,
        metadata: { paymentId: payment.id, orderId: payment.orderId, userId },
      })

      assertCanTransition(payment.status, 'PROCESSING')
      payment.status = 'PROCESSING'
      payment.stripePaymentIntentId = intent.id
      await this.paymentRepo.save(payment)
    }
    // cash_on_delivery: nothing to charge now — the row stays PENDING.

    // 5. Remember the result for retries, then announce the new state.
    await this.idempotencyService.remember(dto.idempotencyKey, payment)
    const event = payment.status === 'PROCESSING' ? 'payment.processing' : 'payment.pending'
    this.eventEmitter.emit(event, payment)

    return payment
  }

  public async getPayment(userId: string, paymentId: string): Promise<Payment | null> {
    const payment = await this.paymentRepo.findOne({ where: { id: paymentId } })
    if (!payment || payment.userId !== userId) return null
    return payment
  }
}
