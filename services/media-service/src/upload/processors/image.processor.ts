import { Processor, WorkerHost } from '@nestjs/bullmq'
import { Logger } from '@nestjs/common'
import type { Job } from 'bullmq'
import sharp from 'sharp'

import { MinioService } from '../minio.service'
import {
  ALLOWED_IMAGE_FORMATS,
  IMAGE_PROCESSING_QUEUE,
  MAX_FILE_SIZE_BYTES,
  MAX_IMAGE_DIMENSION,
  MIN_IMAGE_DIMENSION,
} from '../upload.constants'
import { UploadService } from '../upload.service'
import { UploadProgressService } from '../upload-progress.service'

const RESOLUTIONS = [
  { name: 'thumbnail' as const, width: 150, step: 'resize_thumbnail' as const },
  { name: 'medium' as const, width: 600, step: 'resize_medium' as const },
  { name: 'full' as const, width: 1200, step: 'resize_full' as const },
]

class UnprocessableImageError extends Error {
  public readonly retryable = false
  constructor(message: string) {
    super(message)
    this.name = 'UnprocessableImageError'
  }
}

@Processor(IMAGE_PROCESSING_QUEUE)
export class ImageProcessor extends WorkerHost {
  private readonly logger = new Logger(ImageProcessor.name)

  constructor(
    private readonly minioService: MinioService,
    private readonly uploadService: UploadService,
    private readonly progress: UploadProgressService,
  ) {
    super()
  }

  public async process(job: Job<{ uploadId: string }>): Promise<void> {
    const { uploadId } = job.data
    this.logger.log(`[${job.id}] Processing upload ${uploadId}`)

    try {
      const record = await this.uploadService.getUpload(uploadId)

      // Step 1: Download original from MinIO
      await job.updateProgress(5)
      await this.progress.publish({ uploadId, step: 'download', status: 'started', progress: 5 })
      const originalBuffer = await this.minioService.getBuffer(record.originalKey)
      await this.progress.publish({ uploadId, step: 'download', status: 'done', progress: 10 })

      // Step 1b: Content moderation — validate file size, format, dimensions
      await this.progress.publish({ uploadId, step: 'validate', status: 'started', progress: 12 })
      await this.validateImage(originalBuffer)
      await this.progress.publish({ uploadId, step: 'validate', status: 'done', progress: 15 })

      // Steps 2-4: Resize → WebP → upload for each resolution
      const keys = { thumbnailKey: '', mediumKey: '', fullKey: '' }
      const progressSteps = [20, 45, 70]

      for (let i = 0; i < RESOLUTIONS.length; i++) {
        const { name, width, step } = RESOLUTIONS[i]

        await this.progress.publish({
          uploadId,
          step,
          status: 'started',
          progress: progressSteps[i],
        })

        const processedBuffer = await sharp(originalBuffer)
          .resize(width, null, { withoutEnlargement: true })
          .webp({ quality: 80 })
          .toBuffer()

        const objectKey = `${name}/${uploadId}.webp`
        await this.minioService.putBuffer(objectKey, processedBuffer)
        keys[`${name}Key` as 'thumbnailKey' | 'mediumKey' | 'fullKey'] = objectKey

        await job.updateProgress(progressSteps[i] + 5)
        await this.progress.publish({
          uploadId,
          step,
          status: 'done',
          progress: progressSteps[i] + 5,
        })
      }

      // Step 5: Persist keys to DB
      await this.progress.publish({ uploadId, step: 'save', status: 'started', progress: 80 })
      await this.uploadService.saveProcessingResult(uploadId, keys)
      await this.progress.publish({ uploadId, step: 'save', status: 'done', progress: 90 })

      await job.updateProgress(100)
      await this.progress.publish({ uploadId, step: 'done', status: 'done', progress: 100 })
      this.logger.log(`[${job.id}] Upload ${uploadId} processed successfully`)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.logger.error(`[${job.id}] Failed to process upload ${uploadId}: ${message}`)
      await this.uploadService.markFailed(uploadId, message)
      await this.progress.publish({
        uploadId,
        step: 'failed',
        status: 'error',
        progress: -1,
        message,
      })

      // Don't retry validation failures — the file will never become valid
      if (error instanceof UnprocessableImageError) {
        return
      }
      throw error // rethrow so BullMQ retries the job
    }
  }

  /**
   * Content moderation — reject the file if it isn't a real image, is too big,
   * or has invalid dimensions. Throws UnprocessableImageError on failure so
   * BullMQ does not retry (the file would fail again).
   */
  private async validateImage(buffer: Buffer): Promise<void> {
    if (buffer.byteLength === 0) {
      throw new UnprocessableImageError('Uploaded file is empty')
    }
    if (buffer.byteLength > MAX_FILE_SIZE_BYTES) {
      throw new UnprocessableImageError(
        `File too large: ${buffer.byteLength} bytes (max ${MAX_FILE_SIZE_BYTES})`,
      )
    }

    let metadata: sharp.Metadata
    try {
      metadata = await sharp(buffer).metadata()
    } catch {
      throw new UnprocessableImageError('Uploaded file is not a valid image')
    }

    if (!metadata.format || !ALLOWED_IMAGE_FORMATS.includes(metadata.format as never)) {
      throw new UnprocessableImageError(
        `Unsupported image format: ${metadata.format ?? 'unknown'}. Allowed: ${ALLOWED_IMAGE_FORMATS.join(', ')}`,
      )
    }

    const { width, height } = metadata
    if (!width || !height) {
      throw new UnprocessableImageError('Image has no dimensions')
    }
    if (width < MIN_IMAGE_DIMENSION || height < MIN_IMAGE_DIMENSION) {
      throw new UnprocessableImageError(
        `Image too small: ${width}x${height} (min ${MIN_IMAGE_DIMENSION}px each side)`,
      )
    }
    if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
      throw new UnprocessableImageError(
        `Image too large: ${width}x${height} (max ${MAX_IMAGE_DIMENSION}px each side)`,
      )
    }

    this.logger.debug(
      `Validated image: ${metadata.format} ${width}x${height} ${buffer.byteLength}B`,
    )
  }
}
