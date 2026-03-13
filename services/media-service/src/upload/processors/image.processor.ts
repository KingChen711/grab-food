import { Processor, WorkerHost } from '@nestjs/bullmq'
import { Logger } from '@nestjs/common'
import type { Job } from 'bullmq'
import sharp from 'sharp'

import { MinioService } from '../minio.service'
import { IMAGE_PROCESSING_QUEUE } from '../upload.constants'
import { UploadService } from '../upload.service'

const RESOLUTIONS = [
  { name: 'thumbnail' as const, width: 150 },
  { name: 'medium' as const, width: 600 },
  { name: 'full' as const, width: 1200 },
]

@Processor(IMAGE_PROCESSING_QUEUE)
export class ImageProcessor extends WorkerHost {
  private readonly logger = new Logger(ImageProcessor.name)

  constructor(
    private readonly minioService: MinioService,
    private readonly uploadService: UploadService,
  ) {
    super()
  }

  public async process(job: Job<{ uploadId: string }>): Promise<void> {
    const { uploadId } = job.data
    this.logger.log(`[${job.id}] Processing upload ${uploadId}`)

    try {
      const record = await this.uploadService.getUpload(uploadId)

      // Step 1: Download original file from MinIO
      await job.updateProgress(5)
      const originalBuffer = await this.minioService.getBuffer(record.originalKey)

      // Steps 2-4: For each resolution — resize, convert to WebP, upload
      const keys = { thumbnailKey: '', mediumKey: '', fullKey: '' }

      for (let i = 0; i < RESOLUTIONS.length; i++) {
        const { name, width } = RESOLUTIONS[i]

        const processedBuffer = await sharp(originalBuffer)
          .resize(width, null, { withoutEnlargement: true })
          .webp({ quality: 80 })
          .toBuffer()

        const objectKey = `${name}/${uploadId}.webp`
        await this.minioService.putBuffer(objectKey, processedBuffer)
        keys[`${name}Key` as 'thumbnailKey' | 'mediumKey' | 'fullKey'] = objectKey

        await job.updateProgress(20 + i * 25) // 20 → 45 → 70
      }

      // Step 5: Persist object keys to PostgreSQL
      await this.uploadService.saveProcessingResult(uploadId, keys)

      await job.updateProgress(100)
      this.logger.log(`[${job.id}] Upload ${uploadId} processed successfully`)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.logger.error(`[${job.id}] Failed to process upload ${uploadId}: ${message}`)
      await this.uploadService.markFailed(uploadId, message)
      throw error // rethrow so BullMQ retries the job
    }
  }
}
