import { Inject, Injectable, Logger } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'

import { NOTIFICATION_EVENTS, SendOtpEmailEvent } from '../events/notification.events'
import { TokenBlacklistService } from '../token-blacklist/token-blacklist.service'

export const OTP_TTL_SECONDS = 10 * 60 // 10 minutes

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name)

  constructor(
    @Inject(TokenBlacklistService) private readonly tokenBlacklistService: TokenBlacklistService,
    @Inject(EventEmitter2) private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Generate a 6-digit OTP, store it in Redis, and emit notification event.
   */
  public async generateAndStoreOtp(
    email: string,
    action: 'RESET_PASSWORD' | 'VERIFY_EMAIL',
  ): Promise<void> {
    const otp = this.generateOtp()
    const key = this.buildKey(email)

    // Reuse the Redis client from TokenBlacklistService via a dedicated key prefix
    await this.storeOtp(key, otp)

    this.logger.log(`OTP generated for [${action}] → ${email}`)

    // Emit event — Notification Service will handle actual delivery in Phase 5
    this.eventEmitter.emit(
      NOTIFICATION_EVENTS.SEND_OTP_EMAIL,
      new SendOtpEmailEvent(email, otp, action),
    )
  }

  /**
   * Verify the OTP and consume (delete) it if valid.
   */
  public async verifyOtp(email: string, otp: string): Promise<boolean> {
    const key = this.buildKey(email)
    const stored = await this.getOtp(key)
    if (!stored || stored !== otp) return false

    // Consume the OTP immediately to prevent reuse
    await this.deleteOtp(key)
    return true
  }

  private generateOtp(): string {
    return Math.floor(100_000 + Math.random() * 900_000).toString()
  }

  private buildKey(email: string): string {
    return `otp:email:${email}`
  }

  // These delegate to the Redis client held by TokenBlacklistService
  // We expose Redis via a package-private method on the service
  private async storeOtp(key: string, otp: string): Promise<void> {
    await this.tokenBlacklistService.setRaw(key, otp, OTP_TTL_SECONDS)
  }

  private async getOtp(key: string): Promise<string | null> {
    return this.tokenBlacklistService.getRaw(key)
  }

  private async deleteOtp(key: string): Promise<void> {
    await this.tokenBlacklistService.deleteRaw(key)
  }
}
