import { getQueueToken } from '@nestjs/bullmq'
import { NotFoundException } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'

import { UploadEntity } from './entities/upload.entity'
import { MinioService } from './minio.service'
import { IMAGE_PROCESSING_QUEUE } from './upload.constants'
import { UploadService } from './upload.service'

const mockRepo = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
})

const mockMinio = () => ({
  presignedPutUrl: jest.fn(),
  cdnUrl: jest.fn(),
  getBuffer: jest.fn(),
  putBuffer: jest.fn(),
  removeObject: jest.fn(),
})

const mockQueue = () => ({
  add: jest.fn(),
})

function makeEntity(overrides: Partial<UploadEntity> = {}): UploadEntity {
  return {
    id: 'upload-123',
    context: 'avatar',
    entityId: null,
    originalKey: 'original/upload-123',
    status: 'PENDING',
    thumbnailKey: null,
    mediumKey: null,
    fullKey: null,
    errorMessage: null,
    claimedAt: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  } as UploadEntity
}

describe('UploadService', () => {
  let service: UploadService
  let repo: ReturnType<typeof mockRepo>
  let minio: ReturnType<typeof mockMinio>
  let queue: ReturnType<typeof mockQueue>

  beforeEach(async () => {
    repo = mockRepo()
    minio = mockMinio()
    queue = mockQueue()

    const module = await Test.createTestingModule({
      providers: [
        UploadService,
        { provide: getRepositoryToken(UploadEntity), useValue: repo },
        { provide: MinioService, useValue: minio },
        { provide: getQueueToken(IMAGE_PROCESSING_QUEUE), useValue: queue },
      ],
    }).compile()

    service = module.get(UploadService)
  })

  describe('requestPresignedUrl', () => {
    it('creates a DB row and returns uploadId + presignedUrl', async () => {
      minio.presignedPutUrl.mockResolvedValue('https://minio/presigned')
      repo.create.mockReturnValue({ id: 'upload-123' })
      repo.save.mockResolvedValue(undefined)

      const result = await service.requestPresignedUrl('avatar', 'user-1')

      expect(minio.presignedPutUrl).toHaveBeenCalledWith(expect.stringContaining('original/'), 900)
      expect(repo.save).toHaveBeenCalled()
      expect(result.presignedUrl).toBe('https://minio/presigned')
      expect(result.uploadId).toBeDefined()
      expect(result.expiresAt).toBeDefined()
    })

    it('works without entityId (entityId is null)', async () => {
      minio.presignedPutUrl.mockResolvedValue('https://minio/presigned')
      repo.create.mockReturnValue({})
      repo.save.mockResolvedValue(undefined)

      await service.requestPresignedUrl('menu_item')

      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ entityId: null }))
    })
  })

  describe('confirmUpload', () => {
    it('sets status to PROCESSING and enqueues a job', async () => {
      repo.findOne.mockResolvedValue(makeEntity({ status: 'PENDING' }))
      repo.update.mockResolvedValue(undefined)
      queue.add.mockResolvedValue(undefined)

      await service.confirmUpload('upload-123')

      expect(repo.update).toHaveBeenCalledWith('upload-123', { status: 'PROCESSING' })
      expect(queue.add).toHaveBeenCalledWith(
        'process',
        { uploadId: 'upload-123' },
        expect.objectContaining({ attempts: 3 }),
      )
    })

    it('is idempotent — skips if already PROCESSING', async () => {
      repo.findOne.mockResolvedValue(makeEntity({ status: 'PROCESSING' }))

      await service.confirmUpload('upload-123')

      expect(queue.add).not.toHaveBeenCalled()
    })

    it('throws NotFoundException if upload does not exist', async () => {
      repo.findOne.mockResolvedValue(null)

      await expect(service.confirmUpload('missing')).rejects.toThrow(NotFoundException)
    })
  })

  describe('getUpload', () => {
    it('returns UploadRecord with CDN URLs when DONE', async () => {
      repo.findOne.mockResolvedValue(
        makeEntity({
          status: 'DONE',
          thumbnailKey: 'thumbnail/upload-123.webp',
          mediumKey: 'medium/upload-123.webp',
          fullKey: 'full/upload-123.webp',
        }),
      )
      minio.cdnUrl.mockImplementation((key: string) => `https://cdn/${key}`)

      const result = await service.getUpload('upload-123')

      expect(result.status).toBe('DONE')
      expect(result.urls.medium).toBe('https://cdn/medium/upload-123.webp')
      expect(result.urls.thumbnail).toBe('https://cdn/thumbnail/upload-123.webp')
    })

    it('returns null CDN URLs when PENDING', async () => {
      repo.findOne.mockResolvedValue(makeEntity({ status: 'PENDING' }))

      const result = await service.getUpload('upload-123')

      expect(result.urls.thumbnail).toBeNull()
      expect(result.urls.medium).toBeNull()
      expect(result.urls.full).toBeNull()
    })

    it('throws NotFoundException if upload missing', async () => {
      repo.findOne.mockResolvedValue(null)

      await expect(service.getUpload('missing')).rejects.toThrow(NotFoundException)
    })
  })

  describe('claimUpload', () => {
    it('returns UploadRecord and deletes the row', async () => {
      repo.findOne.mockResolvedValue(
        makeEntity({ status: 'DONE', mediumKey: 'medium/upload-123.webp' }),
      )
      minio.cdnUrl.mockReturnValue('https://cdn/medium/upload-123.webp')
      repo.delete.mockResolvedValue(undefined)

      const result = await service.claimUpload('upload-123')

      expect(result.id).toBe('upload-123')
      expect(repo.delete).toHaveBeenCalledWith('upload-123')
    })
  })

  describe('saveProcessingResult', () => {
    it('updates all three keys and sets status to DONE', async () => {
      repo.update.mockResolvedValue(undefined)

      await service.saveProcessingResult('upload-123', {
        thumbnailKey: 'thumbnail/upload-123.webp',
        mediumKey: 'medium/upload-123.webp',
        fullKey: 'full/upload-123.webp',
      })

      expect(repo.update).toHaveBeenCalledWith('upload-123', {
        thumbnailKey: 'thumbnail/upload-123.webp',
        mediumKey: 'medium/upload-123.webp',
        fullKey: 'full/upload-123.webp',
        status: 'DONE',
      })
    })
  })

  describe('markFailed', () => {
    it('sets status to FAILED with error message', async () => {
      repo.update.mockResolvedValue(undefined)

      await service.markFailed('upload-123', 'sharp: unsupported format')

      expect(repo.update).toHaveBeenCalledWith('upload-123', {
        status: 'FAILED',
        errorMessage: 'sharp: unsupported format',
      })
    })
  })
})
