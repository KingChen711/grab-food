import { HttpExceptionFilter, TransformInterceptor } from '@grab/nestjs-common'
import { ClassSerializerInterceptor, Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core'
import { TerminusModule } from '@nestjs/terminus'

import { AppController } from './app.controller'
import { AppService } from './app.service'
import { databaseConfig } from './config/database.config'
import { rabbitmqConfig } from './config/rabbitmq.config'
import { redisConfig } from './config/redis.config'
import { stripeConfig } from './config/stripe.config'
import { DatabaseModule } from './database/database.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env', '../../.env.local', '../../.env'],
      load: [stripeConfig, redisConfig, rabbitmqConfig, databaseConfig],
    }),
    TerminusModule,
    DatabaseModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    { provide: APP_INTERCEPTOR, useClass: ClassSerializerInterceptor },
  ],
})
export class AppModule {}
