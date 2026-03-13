import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common'
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'

import { RequestUploadDto } from './dto/request-upload.dto'
import { UploadService } from './upload.service'
import type { UploadRecord } from './upload.types'

@ApiTags('uploads')
@Controller('uploads')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  /**
   * Step 1: Client requests a presigned URL.
   *
   * Flow:
   *   Client → POST /uploads/presigned → { uploadId, presignedUrl }
   *   Client → PUT presignedUrl (upload file directly to MinIO, no server in the middle)
   *   Client → POST /uploads/:id/confirm (trigger processing)
   *   Client → GET  /uploads/:id        (poll until status = DONE)
   *   Client → POST /uploads/:id/claim  (save URLs permanently, row deleted)
   *   Client → PATCH /restaurants/:id   (update entity with the returned CDN URL)
   */
  @Post('presigned')
  @ApiOperation({ summary: 'Request a presigned MinIO PUT URL for direct client upload' })
  @ApiResponse({
    status: 201,
    description: '{ uploadId, presignedUrl, expiresAt, wsRoom, wsNamespace }',
  })
  public async requestPresigned(@Body() dto: RequestUploadDto): Promise<{
    uploadId: string
    presignedUrl: string
    expiresAt: string
    wsRoom: string
    wsNamespace: string
  }> {
    const result = await this.uploadService.requestPresignedUrl(dto.context, dto.entityId)
    return {
      ...result,
      wsRoom: `upload:${result.uploadId}`,
      wsNamespace: '/uploads',
    }
  }

  /**
   * Step 2: Client confirms the file was uploaded to MinIO.
   * Enqueues the BullMQ image processing job (resize → WebP → upload all variants).
   */
  @Post(':id/confirm')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Confirm upload complete — triggers async image processing' })
  @ApiResponse({ status: 202, description: 'Processing queued' })
  @ApiResponse({ status: 404, description: 'Upload not found' })
  public confirm(@Param('id') id: string): Promise<void> {
    return this.uploadService.confirmUpload(id)
  }

  /**
   * Step 3: Poll for processing status.
   * When status = DONE, urls.thumbnail / medium / full contain CDN URLs.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get upload status and processed CDN URLs' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404 })
  public getUpload(@Param('id') id: string): Promise<UploadRecord> {
    return this.uploadService.getUpload(id)
  }

  /**
   * Step 4: Claim the upload once CDN URLs have been saved in permanent storage.
   * Returns the final CDN URLs and deletes the tracking row — keeping the table small forever.
   * After claiming, the caller should store the URL in the target service (restaurant, user, etc.).
   */
  @Post(':id/claim')
  @ApiOperation({ summary: 'Claim upload — returns CDN URLs and deletes tracking row' })
  @ApiResponse({ status: 200, description: 'CDN URLs returned, row deleted' })
  @ApiResponse({ status: 404, description: 'Upload not found' })
  public claimUpload(@Param('id') id: string): Promise<UploadRecord> {
    return this.uploadService.claimUpload(id)
  }
}
