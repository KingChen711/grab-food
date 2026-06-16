import { Test } from '@nestjs/testing'

import type { Payment } from '../payments/entities/payment.entity'
import { REDIS_CLIENT } from '../redis/redis.module'
import { IdempotencyService } from './idempotency.service'

// ─── In-memory Redis mock (only the calls IdempotencyService uses) ──────────────

const makeRedisMock = () => {
  const store = new Map<string, string>()
  return {
    get: jest.fn(async (key: string) => store.get(key) ?? null),
    setex: jest.fn(async (key: string, _ttl: number, value: string) => {
      store.set(key, value)
    }),
    _store: store,
  }
}

// A payment with only JSON-serializable primitives so it round-trips exactly.
const payment = {
  id: 'pay-1',
  orderId: 'order-1',
  userId: 'user-1',
  amount: 220_000,
  currency: 'VND',
  method: 'card',
  status: 'SUCCEEDED',
  idempotencyKey: 'order:order-1',
} as Payment

const TWENTY_FOUR_HOURS = 24 * 60 * 60

describe('IdempotencyService', () => {
  let service: IdempotencyService
  let redis: ReturnType<typeof makeRedisMock>

  beforeEach(async () => {
    redis = makeRedisMock()

    const module = await Test.createTestingModule({
      providers: [IdempotencyService, { provide: REDIS_CLIENT, useValue: redis }],
    }).compile()

    service = module.get(IdempotencyService)
  })

  afterEach(() => jest.clearAllMocks())

  describe('check', () => {
    it('returns null when nothing is stored for the key', async () => {
      await expect(service.check('order:missing')).resolves.toBeNull()
    })

    it('looks up the namespaced key', async () => {
      await service.check('order:order-1')
      expect(redis.get).toHaveBeenCalledWith('idempotency_key:order:order-1')
    })
  })

  describe('remember', () => {
    it('stores under the namespaced key with the default 24h TTL', async () => {
      await service.remember('order:order-1', payment)

      expect(redis.setex).toHaveBeenCalledWith(
        'idempotency_key:order:order-1',
        TWENTY_FOUR_HOURS,
        expect.any(String),
      )
    })

    it('honours a custom TTL', async () => {
      await service.remember('order:order-1', payment, 60)

      expect(redis.setex).toHaveBeenCalledWith(
        'idempotency_key:order:order-1',
        60,
        expect.any(String),
      )
    })
  })

  describe('round-trip', () => {
    it('remember() then check() returns the same payment', async () => {
      await service.remember('order:order-1', payment)

      await expect(service.check('order:order-1')).resolves.toEqual(payment)
    })

    it('a different key does not see the stored value', async () => {
      await service.remember('order:order-1', payment)

      await expect(service.check('order:other')).resolves.toBeNull()
    })
  })
})
