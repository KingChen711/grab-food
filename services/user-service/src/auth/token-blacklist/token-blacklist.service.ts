import type { OnModuleDestroy } from '@nestjs/common';
import { Inject, Injectable, Logger } from '@nestjs/common'
import type Redis from 'ioredis'

export const REDIS_CLIENT = 'REDIS_CLIENT'

@Injectable()
export class TokenBlacklistService implements OnModuleDestroy {
  private readonly logger = new Logger(TokenBlacklistService.name)
  private readonly keyPrefix = 'bl:jti:'
  private readonly userRevokePrefix = 'bl:user:'

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  public onModuleDestroy(): void {
    this.redis.disconnect()
    this.logger.log('Redis connection closed')
  }

  /**
   * Blacklist a specific token by JTI
   * @param jti JWT ID
   * @param ttlSeconds Time to live in seconds (should match token's remaining validity)
   */
  public async blacklist(jti: string, ttlSeconds: number): Promise<void> {
    if (ttlSeconds <= 0) return

    const key = `${this.keyPrefix}${jti}`
    await this.redis.set(key, '1', 'EX', ttlSeconds)
    this.logger.debug(`Blacklisted token ${jti} for ${ttlSeconds}s`)
  }

  /**
   * Check if a specific token is blacklisted
   * @param jti JWT ID
   */
  public async isBlacklisted(jti: string): Promise<boolean> {
    const key = `${this.keyPrefix}${jti}`
    const exists = await this.redis.exists(key)
    return exists === 1
  }

  /**
   * Blacklist all tokens for a user issued before the current time
   * @param userId User ID
   * @param ttlSeconds Time to keep this record (should match max possible token lifetime)
   */
  public async blacklistAllForUser(userId: string, ttlSeconds: number): Promise<void> {
    if (ttlSeconds <= 0) return

    const key = `${this.userRevokePrefix}${userId}`
    const timestamp = Math.floor(Date.now() / 1000)
    await this.redis.set(key, timestamp.toString(), 'EX', ttlSeconds)
    this.logger.log(`Blacklisted all tokens for user ${userId} issued before ${timestamp}`)
  }

  /**
   * Check if a user's tokens issued at a specific time have been broadly revoked
   * @param userId User ID
   * @param iat Issued At timestamp (in seconds)
   */
  public async isUserRevokedBefore(userId: string, iat: number): Promise<boolean> {
    const key = `${this.userRevokePrefix}${userId}`
    const revokeTimestampStr = await this.redis.get(key)

    if (!revokeTimestampStr) return false

    const revokeTimestamp = parseInt(revokeTimestampStr, 10)
    // If the token was issued before or at the exact same second the revoke was initiated, it is invalid
    return iat <= revokeTimestamp
  }
}
