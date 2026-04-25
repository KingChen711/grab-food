import { Test } from '@nestjs/testing'

import { MinioService } from '../minio.service'
import { UploadService } from '../upload.service'
import { UploadProgressService } from '../upload-progress.service'
import { ImageProcessor } from './image.processor'

// Mock sharp module — avoids native binary dependency in tests
const sharpMetadataMock = jest.fn()
jest.mock('sharp', () => {
  const chain = {
    resize: jest.fn().mockReturnThis(),
    webp: jest.fn().mockReturnThis(),
    toBuffer: jest.fn().mockResolvedValue(Buffer.from('fake-webp')),
    metadata: (...args: unknown[]) => sharpMetadataMock(...args),
  }
  return jest.fn(() => chain)
})

const mockMinio = () => ({
  getBuffer: jest.fn(),
  putBuffer: jest.fn(),
  cdnUrl: jest.fn(),
  presignedPutUrl: jest.fn(),
  removeObject: jest.fn(),
})

const mockUploadService = () => ({
  getUpload: jest.fn(),
  saveProcessingResult: jest.fn(),
  markFailed: jest.fn(),
})

const mockProgress = () => ({
  publish: jest.fn(),
})

function makeRecord(overrides = {}) {
  return {
    id: 'upload-abc',
    context: 'avatar',
    entityId: null,
    originalKey: 'original/upload-abc',
    status: 'PROCESSING',
    urls: { thumbnail: null, medium: null, full: null },
    error: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

function makeJob(uploadId = 'upload-abc') {
  return {
    id: 'job-1',
    data: { uploadId },
    updateProgress: jest.fn(),
  } as any
}

describe('ImageProcessor', () => {
  let processor: ImageProcessor
  let minio: ReturnType<typeof mockMinio>
  let uploadService: ReturnType<typeof mockUploadService>
  let progress: ReturnType<typeof mockProgress>

  beforeEach(async () => {
    minio = mockMinio()
    uploadService = mockUploadService()
    progress = mockProgress()
    sharpMetadataMock.mockReset().mockResolvedValue({ format: 'jpeg', width: 800, height: 600 })

    const module = await Test.createTestingModule({
      providers: [
        ImageProcessor,
        { provide: MinioService, useValue: minio },
        { provide: UploadService, useValue: uploadService },
        { provide: UploadProgressService, useValue: progress },
      ],
    }).compile()

    processor = module.get(ImageProcessor)
  })

  describe('process', () => {
    it('downloads original, resizes to 3 resolutions, saves keys, emits done', async () => {
      uploadService.getUpload.mockResolvedValue(makeRecord())
      minio.getBuffer.mockResolvedValue(Buffer.from('original-bytes'))
      minio.putBuffer.mockResolvedValue(undefined)
      uploadService.saveProcessingResult.mockResolvedValue(undefined)
      progress.publish.mockResolvedValue(undefined)

      await processor.process(makeJob())

      expect(minio.getBuffer).toHaveBeenCalledWith('original/upload-abc')
      expect(minio.putBuffer).toHaveBeenCalledTimes(3) // thumbnail, medium, full

      // Keys follow the pattern {resolution}/{uploadId}.webp
      expect(minio.putBuffer).toHaveBeenCalledWith('thumbnail/upload-abc.webp', expect.any(Buffer))
      expect(minio.putBuffer).toHaveBeenCalledWith('medium/upload-abc.webp', expect.any(Buffer))
      expect(minio.putBuffer).toHaveBeenCalledWith('full/upload-abc.webp', expect.any(Buffer))

      expect(uploadService.saveProcessingResult).toHaveBeenCalledWith('upload-abc', {
        thumbnailKey: 'thumbnail/upload-abc.webp',
        mediumKey: 'medium/upload-abc.webp',
        fullKey: 'full/upload-abc.webp',
      })

      // Final done event
      const lastCall = progress.publish.mock.calls.at(-1)?.[0]
      expect(lastCall).toMatchObject({ step: 'done', status: 'done', progress: 100 })
    })

    it('publishes progress events in order: download → validate → resize × 3 → save → done', async () => {
      uploadService.getUpload.mockResolvedValue(makeRecord())
      minio.getBuffer.mockResolvedValue(Buffer.from('bytes'))
      minio.putBuffer.mockResolvedValue(undefined)
      uploadService.saveProcessingResult.mockResolvedValue(undefined)
      progress.publish.mockResolvedValue(undefined)

      await processor.process(makeJob())

      const steps = progress.publish.mock.calls.map((c: any[]) => c[0].step)
      expect(steps).toEqual([
        'download',
        'download',
        'validate',
        'validate',
        'resize_thumbnail',
        'resize_thumbnail',
        'resize_medium',
        'resize_medium',
        'resize_full',
        'resize_full',
        'save',
        'save',
        'done',
      ])
    })

    it('calls markFailed, publishes failed event, and rethrows on error', async () => {
      uploadService.getUpload.mockResolvedValue(makeRecord())
      minio.getBuffer.mockRejectedValue(new Error('MinIO connection refused'))
      uploadService.markFailed.mockResolvedValue(undefined)
      progress.publish.mockResolvedValue(undefined)

      await expect(processor.process(makeJob())).rejects.toThrow('MinIO connection refused')

      expect(uploadService.markFailed).toHaveBeenCalledWith(
        'upload-abc',
        'MinIO connection refused',
      )

      const failEvent = progress.publish.mock.calls.find((c: any[]) => c[0].step === 'failed')?.[0]
      expect(failEvent).toMatchObject({ step: 'failed', status: 'error' })
    })
  })

  describe('content moderation', () => {
    it('rejects empty file without retry', async () => {
      uploadService.getUpload.mockResolvedValue(makeRecord())
      minio.getBuffer.mockResolvedValue(Buffer.alloc(0))
      uploadService.markFailed.mockResolvedValue(undefined)
      progress.publish.mockResolvedValue(undefined)

      // Should NOT rethrow (validation errors don't retry)
      await processor.process(makeJob())

      expect(uploadService.markFailed).toHaveBeenCalledWith(
        'upload-abc',
        expect.stringContaining('empty'),
      )
      expect(minio.putBuffer).not.toHaveBeenCalled()
    })

    it('rejects oversized file without retry', async () => {
      uploadService.getUpload.mockResolvedValue(makeRecord())
      // 11 MB > 10 MB limit
      minio.getBuffer.mockResolvedValue(Buffer.alloc(11 * 1024 * 1024))
      uploadService.markFailed.mockResolvedValue(undefined)
      progress.publish.mockResolvedValue(undefined)

      await processor.process(makeJob())

      expect(uploadService.markFailed).toHaveBeenCalledWith(
        'upload-abc',
        expect.stringContaining('too large'),
      )
      expect(minio.putBuffer).not.toHaveBeenCalled()
    })

    it('rejects non-image file (sharp metadata throws)', async () => {
      uploadService.getUpload.mockResolvedValue(makeRecord())
      minio.getBuffer.mockResolvedValue(Buffer.from('not-an-image-just-text'))
      sharpMetadataMock.mockRejectedValueOnce(
        new Error('Input buffer contains unsupported image format'),
      )
      uploadService.markFailed.mockResolvedValue(undefined)
      progress.publish.mockResolvedValue(undefined)

      await processor.process(makeJob())

      expect(uploadService.markFailed).toHaveBeenCalledWith(
        'upload-abc',
        expect.stringContaining('not a valid image'),
      )
    })

    it('rejects unsupported format (e.g. tiff)', async () => {
      uploadService.getUpload.mockResolvedValue(makeRecord())
      minio.getBuffer.mockResolvedValue(Buffer.from('bytes'))
      sharpMetadataMock.mockResolvedValueOnce({ format: 'tiff', width: 100, height: 100 })
      uploadService.markFailed.mockResolvedValue(undefined)
      progress.publish.mockResolvedValue(undefined)

      await processor.process(makeJob())

      expect(uploadService.markFailed).toHaveBeenCalledWith(
        'upload-abc',
        expect.stringContaining('Unsupported image format'),
      )
    })

    it('rejects images smaller than minimum dimensions', async () => {
      uploadService.getUpload.mockResolvedValue(makeRecord())
      minio.getBuffer.mockResolvedValue(Buffer.from('bytes'))
      sharpMetadataMock.mockResolvedValueOnce({ format: 'jpeg', width: 16, height: 16 })
      uploadService.markFailed.mockResolvedValue(undefined)
      progress.publish.mockResolvedValue(undefined)

      await processor.process(makeJob())

      expect(uploadService.markFailed).toHaveBeenCalledWith(
        'upload-abc',
        expect.stringContaining('too small'),
      )
    })

    it('rejects images larger than maximum dimensions', async () => {
      uploadService.getUpload.mockResolvedValue(makeRecord())
      minio.getBuffer.mockResolvedValue(Buffer.from('bytes'))
      sharpMetadataMock.mockResolvedValueOnce({ format: 'jpeg', width: 10000, height: 10000 })
      uploadService.markFailed.mockResolvedValue(undefined)
      progress.publish.mockResolvedValue(undefined)

      await processor.process(makeJob())

      expect(uploadService.markFailed).toHaveBeenCalledWith(
        'upload-abc',
        expect.stringContaining('too large'),
      )
    })
  })
})
