import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Redis from 'ioredis'

export interface UploadProgressEvent {
  uploadId: string
  step:
    | 'download'
    | 'resize_thumbnail'
    | 'resize_medium'
    | 'resize_full'
    | 'save'
    | 'done'
    | 'failed'
  status: 'started' | 'done' | 'error'
  progress: number
  message?: string
}

@Injectable()
export class UploadProgressService implements OnModuleDestroy {
  private readonly logger = new Logger(UploadProgressService.name)
  private readonly publisher: Redis

  constructor(private readonly config: ConfigService) {
    this.publisher = new Redis({
      host: config.get<string>('REDIS_HOST', 'localhost'),
      port: config.get<number>('REDIS_PORT') ?? 6379,
      lazyConnect: true,
    })
    this.publisher.connect().catch((err: unknown) => {
      this.logger.warn(`Redis pub/sub connect failed (non-fatal in dev): ${String(err)}`)
    })
  }

  public async publish(event: UploadProgressEvent): Promise<void> {
    try {
      await this.publisher.publish(`upload:${event.uploadId}`, JSON.stringify(event))
    } catch (err) {
      this.logger.warn(`Failed to publish progress for ${event.uploadId}: ${String(err)}`)
    }
  }

  public async onModuleDestroy(): Promise<void> {
    await this.publisher.quit().catch(() => {})
  }
}
