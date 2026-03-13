import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { InjectRepository } from '@nestjs/typeorm'
import { LessThan, Repository } from 'typeorm'

import { RefreshToken } from '../entities/refresh-token.entity'

@Injectable()
export class TokenCleanupService {
  private readonly logger = new Logger(TokenCleanupService.name)

  constructor(
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepo: Repository<RefreshToken>,
  ) {}

  // Runs every day at 03:00 AM
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  public async purgeExpiredTokens(): Promise<void> {
    const cutoff = new Date()

    const { affected } = await this.refreshTokenRepo.delete({
      expiresAt: LessThan(cutoff),
    })

    if (affected) {
      this.logger.log(`Purged ${affected} expired refresh tokens`)
    }
  }
}
