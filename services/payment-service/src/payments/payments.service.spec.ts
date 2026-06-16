import { BadRequestException } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'

import { IdempotencyService } from '../idempotency/idempotency.service'
import { StripeService } from '../stripe/stripe.service'
import type { CreatePaymentInput } from './dtos/create-payment.dto'
import { Payment } from './entities/payment.entity'
import { assertCanTransition } from './payment.state-machine'
import { PaymentsService } from './payments.service'

// ─── Fixtures ───────────────────────────────────────────────────────────────────

const USER_ID = '00000000-0000-0000-0000-000000000001'
const ORDER_ID = '00000000-0000-0000-0000-000000000010'

const cardDto: CreatePaymentInput = {
  orderId: ORDER_ID,
  amount: 220_000,
  currency: 'VND',
  method: 'card',
  idempotencyKey: `order:${ORDER_ID}`,
}

const codDto: CreatePaymentInput = { ...cardDto, method: 'cash_on_delivery' }

// ─── Mocks ──────────────────────────────────────────────────────────────────────

const makeRepo = (): {
  create: jest.Mock
  save: jest.Mock
  findOne: jest.Mock
} => {
  let seq = 0
  return {
    // Echo the partial back — mimics `repo.create(dto)` returning an entity.
    create: jest.fn((data: Partial<Payment>) => ({ ...data })),
    // Assign an id on first save, then echo the (possibly mutated) entity back.
    save: jest.fn(async (entity: Payment) => ({ ...entity, id: entity.id ?? `pay-${++seq}` })),
    findOne: jest.fn(),
  }
}

describe('PaymentsService', () => {
  let service: PaymentsService
  let repo: ReturnType<typeof makeRepo>
  let idempotency: jest.Mocked<Pick<IdempotencyService, 'check' | 'remember'>>
  let stripe: jest.Mocked<Pick<StripeService, 'createPaymentIntent'>>
  let events: jest.Mocked<Pick<EventEmitter2, 'emit'>>

  beforeEach(async () => {
    repo = makeRepo()
    idempotency = { check: jest.fn().mockResolvedValue(null), remember: jest.fn() }
    stripe = { createPaymentIntent: jest.fn() }
    events = { emit: jest.fn() }

    const module = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: IdempotencyService, useValue: idempotency },
        { provide: StripeService, useValue: stripe },
        { provide: EventEmitter2, useValue: events },
        { provide: getRepositoryToken(Payment), useValue: repo },
      ],
    }).compile()

    service = module.get(PaymentsService)
  })

  afterEach(() => jest.clearAllMocks())

  describe('createPayment', () => {
    it('returns the cached payment on an idempotent replay without charging again', async () => {
      const cached = { id: 'pay-cached', status: 'PROCESSING' } as Payment
      idempotency.check.mockResolvedValueOnce(cached)

      const result = await service.createPayment(USER_ID, cardDto)

      expect(result).toBe(cached)
      expect(repo.create).not.toHaveBeenCalled()
      expect(stripe.createPaymentIntent).not.toHaveBeenCalled()
      expect(idempotency.remember).not.toHaveBeenCalled()
    })

    it('card → creates a PaymentIntent, moves to PROCESSING and emits payment.processing', async () => {
      stripe.createPaymentIntent.mockResolvedValueOnce({ id: 'pi_123' } as never)

      const result = await service.createPayment(USER_ID, cardDto)

      // VND is zero-decimal: amount passed through as-is, currency lower-cased.
      expect(stripe.createPaymentIntent).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 220_000, currency: 'vnd' }),
      )
      expect(result.status).toBe('PROCESSING')
      expect(result.stripePaymentIntentId).toBe('pi_123')
      expect(idempotency.remember).toHaveBeenCalledWith(cardDto.idempotencyKey, result)
      expect(events.emit).toHaveBeenCalledWith('payment.processing', result)
    })

    it('cash_on_delivery → stays PENDING, skips Stripe and emits payment.pending', async () => {
      const result = await service.createPayment(USER_ID, codDto)

      expect(stripe.createPaymentIntent).not.toHaveBeenCalled()
      expect(result.status).toBe('PENDING')
      expect(events.emit).toHaveBeenCalledWith('payment.pending', result)
    })

    it('rejects a method that is not supported yet (wallet)', async () => {
      await expect(
        service.createPayment(USER_ID, { ...cardDto, method: 'wallet' }),
      ).rejects.toBeInstanceOf(BadRequestException)

      expect(repo.create).not.toHaveBeenCalled()
    })
  })

  describe('getPayment', () => {
    it('returns the payment when it belongs to the user', async () => {
      const payment = { id: 'pay-1', userId: USER_ID } as Payment
      repo.findOne.mockResolvedValueOnce(payment)

      await expect(service.getPayment(USER_ID, 'pay-1')).resolves.toBe(payment)
    })

    it('returns null when the payment belongs to someone else', async () => {
      repo.findOne.mockResolvedValueOnce({ id: 'pay-1', userId: 'someone-else' } as Payment)

      await expect(service.getPayment(USER_ID, 'pay-1')).resolves.toBeNull()
    })
  })
})

describe('payment state machine', () => {
  it('allows PENDING → PROCESSING', () => {
    expect(() => assertCanTransition('PENDING', 'PROCESSING')).not.toThrow()
  })

  it('throws on an invalid transition (SUCCEEDED → PROCESSING)', () => {
    expect(() => assertCanTransition('SUCCEEDED', 'PROCESSING')).toThrow(BadRequestException)
  })

  it('throws on a transition out of a terminal state (FAILED → SUCCEEDED)', () => {
    expect(() => assertCanTransition('FAILED', 'SUCCEEDED')).toThrow(BadRequestException)
  })
})
