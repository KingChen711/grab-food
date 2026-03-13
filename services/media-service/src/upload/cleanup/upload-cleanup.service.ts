import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { InjectRepository } from '@nestjs/typeorm'
import { IsNull, LessThan, Repository } from 'typeorm'

import { UploadEntity } from '../entities/upload.entity'
import { MinioService } from '../minio.service'

/** Rows eligible for GC — never accumulates because we delete on claim or expiry */
@Injectable()
export class UploadCleanupService {
  private readonly logger = new Logger(UploadCleanupService.name)

  constructor(
    @InjectRepository(UploadEntity)
    private readonly uploads: Repository<UploadEntity>,
    private readonly minioService: MinioService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  public async cleanup(): Promise<void> {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000)
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000)

    // 1. Unclaimed DONE uploads older than 2h (client never saved the URL)
    const staleDone = await this.uploads.find({
      where: { status: 'DONE', claimedAt: IsNull(), createdAt: LessThan(twoHoursAgo) },
    })

    // 2. FAILED uploads (original already uploaded; variants were never created)
    const failed = await this.uploads.find({ where: { status: 'FAILED' } })

    // 3. Stuck PROCESSING (worker crashed before completing, older than 30 min)
    const stuckProcessing = await this.uploads.find({
      where: {
        status: 'PROCESSING',
        createdAt: LessThan(thirtyMinutesAgo),
      },
    })

    const toDelete = [...staleDone, ...failed, ...stuckProcessing]
    if (toDelete.length === 0) return

    this.logger.log(
      `Cleanup: ${staleDone.length} stale-done, ${failed.length} failed, ` +
        `${stuckProcessing.length} stuck-processing — deleting ${toDelete.length} rows`,
    )

    for (const entity of toDelete) {
      await this.deleteMinioObjects(entity)
    }

    const ids = toDelete.map((e) => e.id)
    await this.uploads.delete(ids)
  }

  private async deleteMinioObjects(entity: UploadEntity): Promise<void> {
    const keys = [entity.originalKey, entity.thumbnailKey, entity.mediumKey, entity.fullKey].filter(
      (k): k is string => k !== null,
    )

    for (const key of keys) {
      try {
        await this.minioService.removeObject(key)
      } catch (err) {
        // Non-fatal — object may have already been removed
        this.logger.warn(`Failed to delete MinIO object ${key}: ${String(err)}`)
      }
    }
  }
}
