import { BullModule } from '@nestjs/bullmq'
import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { ScheduleModule } from '@nestjs/schedule'
import { TypeOrmModule } from '@nestjs/typeorm'

import { UploadCleanupService } from './cleanup/upload-cleanup.service'
import { UploadEntity } from './entities/upload.entity'
import { MinioService } from './minio.service'
import { ImageProcessor } from './processors/image.processor'
import { IMAGE_PROCESSING_QUEUE } from './upload.constants'
import { UploadController } from './upload.controller'
import { UploadGateway } from './upload.gateway'
import { UploadService } from './upload.service'
import { UploadProgressService } from './upload-progress.service'

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('REDIS_QUEUE_HOST', 'localhost'),
          port: config.get<number>('REDIS_QUEUE_PORT') ?? 6380,
        },
      }),
    }),
    BullModule.registerQueue({ name: IMAGE_PROCESSING_QUEUE }),
    TypeOrmModule.forFeature([UploadEntity]),
    ScheduleModule.forRoot(),
  ],
  controllers: [UploadController],
  providers: [
    MinioService,
    UploadService,
    ImageProcessor,
    UploadCleanupService,
    UploadProgressService,
    UploadGateway,
  ],
})
export class UploadModule {}
