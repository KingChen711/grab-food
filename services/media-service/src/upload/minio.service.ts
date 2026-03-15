import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as Minio from 'minio'

@Injectable()
export class MinioService implements OnModuleInit {
  private readonly logger = new Logger(MinioService.name)
  private readonly client: Minio.Client
  private readonly bucket: string
  private readonly cdnBaseUrl: string

  constructor(private readonly config: ConfigService) {
    this.client = new Minio.Client({
      endPoint: config.getOrThrow<string>('minio.endPoint'),
      port: config.getOrThrow<number>('minio.port'),
      useSSL: config.getOrThrow<boolean>('minio.useSSL') ?? false,
      accessKey: config.getOrThrow<string>('minio.accessKey'),
      secretKey: config.getOrThrow<string>('minio.secretKey'),
    })
    this.bucket = config.getOrThrow<string>('minio.bucket')
    this.cdnBaseUrl = config.getOrThrow<string>('minio.cdnBaseUrl')
  }

  public async onModuleInit(): Promise<void> {
    try {
      const exists = await this.client.bucketExists(this.bucket)
      if (!exists) {
        await this.client.makeBucket(this.bucket, 'us-east-1')
        this.logger.log(`Bucket created: ${this.bucket}`)
      }

      // Allow anonymous GET on all objects so CDN URLs are publicly readable
      const publicReadPolicy = JSON.stringify({
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: { AWS: ['*'] },
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${this.bucket}/*`],
          },
        ],
      })
      await this.client.setBucketPolicy(this.bucket, publicReadPolicy)
      this.logger.log(`Bucket public-read policy set: ${this.bucket}`)
    } catch (err) {
      // Non-fatal — MinIO may not be running in test environments
      this.logger.warn(`MinIO init warning: ${String(err)}`)
    }
  }

  /** Generate a presigned PUT URL — client uploads directly to MinIO */
  public async presignedPutUrl(objectKey: string, expirySeconds = 900): Promise<string> {
    return this.client.presignedPutObject(this.bucket, objectKey, expirySeconds)
  }

  /** Download an object from MinIO into a Buffer */
  public async getBuffer(objectKey: string): Promise<Buffer> {
    const stream = await this.client.getObject(this.bucket, objectKey)
    const chunks: Buffer[] = []
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as ArrayBuffer))
    }
    return Buffer.concat(chunks)
  }

  /** Upload a buffer to MinIO */
  public async putBuffer(
    objectKey: string,
    buffer: Buffer,
    contentType = 'image/webp',
  ): Promise<void> {
    await this.client.putObject(this.bucket, objectKey, buffer, buffer.length, {
      'Content-Type': contentType,
    })
  }

  /** Build public CDN URL for a processed object */
  public cdnUrl(objectKey: string): string {
    return `${this.cdnBaseUrl}/${objectKey}`
  }

  /** Remove an object from MinIO */
  public async removeObject(objectKey: string): Promise<void> {
    await this.client.removeObject(this.bucket, objectKey)
  }
}
