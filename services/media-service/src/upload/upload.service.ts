import { InjectQueue } from '@nestjs/bullmq'
import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Queue } from 'bullmq'
import { Repository } from 'typeorm'

import { UploadEntity } from './entities/upload.entity'
import { MinioService } from './minio.service'
import { IMAGE_PROCESSING_QUEUE } from './upload.constants'
import type { UploadContext, UploadRecord } from './upload.types'

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name)

  constructor(
    @InjectRepository(UploadEntity)
    private readonly uploads: Repository<UploadEntity>,
    private readonly minioService: MinioService,
    @InjectQueue(IMAGE_PROCESSING_QUEUE) private readonly imageQueue: Queue,
  ) {}

  /**
   * Step 1 — client requests a presigned URL.
   * Creates an upload row in PostgreSQL and returns a temporary MinIO PUT URL.
   * The client uploads the file directly to MinIO using this URL.
   */
  public async requestPresignedUrl(
    context: UploadContext,
    entityId?: string,
  ): Promise<{ uploadId: string; presignedUrl: string; expiresAt: string }> {
    const uploadId = crypto.randomUUID()
    const originalKey = `original/${uploadId}`
    const expirySeconds = 900 // 15 minutes

    const presignedUrl = await this.minioService.presignedPutUrl(originalKey, expirySeconds)

    await this.uploads.save(
      this.uploads.create({
        id: uploadId,
        context,
        entityId: entityId ?? null,
        originalKey,
        status: 'PENDING',
        thumbnailKey: null,
        mediumKey: null,
        fullKey: null,
        errorMessage: null,
        claimedAt: null,
      }),
    )

    this.logger.log(`Presigned URL created for upload ${uploadId} (${context})`)

    return {
      uploadId,
      presignedUrl,
      expiresAt: new Date(Date.now() + expirySeconds * 1000).toISOString(),
    }
  }

  /**
   * Step 2 — client calls this after finishing the MinIO PUT upload.
   * Enqueues a BullMQ job to process the image (resize → WebP → upload variants).
   */
  public async confirmUpload(uploadId: string): Promise<void> {
    const entity = await this.findEntity(uploadId)

    if (entity.status !== 'PENDING') return // idempotent — already queued or done

    await this.uploads.update(uploadId, { status: 'PROCESSING' })

    await this.imageQueue.add(
      'process',
      { uploadId },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5_000 },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    )

    this.logger.log(`Upload ${uploadId} confirmed — enqueued for image processing`)
  }

  /** Poll endpoint — returns current upload status and processed CDN URLs when done */
  public async getUpload(uploadId: string): Promise<UploadRecord> {
    return this.toRecord(await this.findEntity(uploadId))
  }

  /**
   * Claim endpoint — called once the client has saved the CDN URLs in permanent storage.
   * Returns the CDN URLs then deletes the row (MinIO objects are kept; CDN serves them).
   */
  public async claimUpload(uploadId: string): Promise<UploadRecord> {
    const entity = await this.findEntity(uploadId)
    const record = this.toRecord(entity)
    await this.uploads.delete(uploadId)
    this.logger.log(`Upload ${uploadId} claimed and row deleted`)
    return record
  }

  /** Called by ImageProcessor to persist processed keys */
  public async saveProcessingResult(
    uploadId: string,
    keys: { thumbnailKey: string; mediumKey: string; fullKey: string },
  ): Promise<void> {
    await this.uploads.update(uploadId, { ...keys, status: 'DONE' })
  }

  /** Called by ImageProcessor on failure */
  public async markFailed(uploadId: string, errorMessage: string): Promise<void> {
    await this.uploads.update(uploadId, { status: 'FAILED', errorMessage })
  }

  // ── Internal ──────────────────────────────────────────────────────────────

  private async findEntity(uploadId: string): Promise<UploadEntity> {
    const entity = await this.uploads.findOne({ where: { id: uploadId } })
    if (!entity) throw new NotFoundException(`Upload ${uploadId} not found`)
    return entity
  }

  private toRecord(entity: UploadEntity): UploadRecord {
    return {
      id: entity.id,
      context: entity.context,
      entityId: entity.entityId,
      originalKey: entity.originalKey,
      status: entity.status,
      urls: {
        thumbnail: entity.thumbnailKey ? this.minioService.cdnUrl(entity.thumbnailKey) : null,
        medium: entity.mediumKey ? this.minioService.cdnUrl(entity.mediumKey) : null,
        full: entity.fullKey ? this.minioService.cdnUrl(entity.fullKey) : null,
      },
      error: entity.errorMessage,
      createdAt: entity.createdAt.toISOString(),
    }
  }
}
