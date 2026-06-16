import { ConfigService } from '@nestjs/config'
import { Test } from '@nestjs/testing'
import Stripe from 'stripe'

import { StripeService } from './stripe.service'

// Mock the SDK: `new Stripe(...)` always returns the same instance, so the test
// can assert against the exact methods the service calls. The instance is built
// inside the factory (no out-of-scope refs → no temporal-dead-zone issues).
jest.mock('stripe', () => {
  const instance = {
    paymentIntents: { create: jest.fn() },
    setupIntents: { create: jest.fn() },
    refunds: { create: jest.fn() },
    webhooks: { constructEvent: jest.fn() },
  }
  return { __esModule: true, default: jest.fn(() => instance) }
})

interface StripeMock {
  paymentIntents: { create: jest.Mock }
  setupIntents: { create: jest.Mock }
  refunds: { create: jest.Mock }
  webhooks: { constructEvent: jest.Mock }
}

// The mocked constructor returns the singleton instance the service uses.
const stripe = new (Stripe as unknown as new (key?: string) => StripeMock)()

const config = {
  getOrThrow: jest.fn((key: string) => (key === 'stripe.secretKey' ? 'sk_test_x' : 'whsec_x')),
} as unknown as ConfigService

describe('StripeService', () => {
  let service: StripeService

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [StripeService, { provide: ConfigService, useValue: config }],
    }).compile()

    service = module.get(StripeService)
  })

  afterEach(() => jest.clearAllMocks())

  describe('createPaymentIntent', () => {
    it('passes the amount through and defaults currency to vnd', async () => {
      stripe.paymentIntents.create.mockResolvedValueOnce({ id: 'pi_1' })

      await service.createPaymentIntent({ amount: 220_000 })

      expect(stripe.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 220_000, currency: 'vnd' }),
      )
    })

    it('respects an explicit currency', async () => {
      stripe.paymentIntents.create.mockResolvedValueOnce({ id: 'pi_1' })

      await service.createPaymentIntent({ amount: 100, currency: 'usd' })

      expect(stripe.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({ currency: 'usd' }),
      )
    })
  })

  describe('createSetupIntent', () => {
    it('creates an off-session SetupIntent for the customer', async () => {
      stripe.setupIntents.create.mockResolvedValueOnce({ id: 'seti_1' })

      await service.createSetupIntent('cus_1')

      expect(stripe.setupIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({ customer: 'cus_1', usage: 'off_session' }),
      )
    })
  })

  describe('refund', () => {
    it('refunds a payment intent with an optional partial amount', async () => {
      stripe.refunds.create.mockResolvedValueOnce({ id: 're_1' })

      await service.refund('pi_1', 5_000)

      expect(stripe.refunds.create).toHaveBeenCalledWith({ payment_intent: 'pi_1', amount: 5_000 })
    })
  })

  describe('constructWebhookEvent', () => {
    it('verifies the payload against the configured webhook secret', () => {
      stripe.webhooks.constructEvent.mockReturnValueOnce({ type: 'payment_intent.succeeded' })
      const body = Buffer.from('{}')

      service.constructWebhookEvent(body, 'sig_header')

      expect(stripe.webhooks.constructEvent).toHaveBeenCalledWith(body, 'sig_header', 'whsec_x')
    })
  })
})
