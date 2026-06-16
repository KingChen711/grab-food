import { Inject, Injectable } from '@nestjs/common'
import Redis from 'ioredis'

import { Payment } from '../payments/entities/payment.entity'
import { REDIS_CLIENT } from '../redis/redis.module'

@Injectable()
export class IdempotencyService {
  private readonly PAYMENT_TTL = 24 * 60 * 60
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  public async check(key: string): Promise<Payment | null> {
    const raw = await this.redis.get(this.key(key))
    if (!raw) return null
    return JSON.parse(raw) as Payment
  }

  public async remember(
    key: string,
    response: Payment,
    ttlSeconds = this.PAYMENT_TTL,
  ): Promise<void> {
    await this.redis.setex(this.key(key), ttlSeconds, JSON.stringify(response))
  }

  private key(key: string): string {
    return `idempotency_key:${key}`
  }
}
