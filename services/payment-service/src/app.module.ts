import {
  HttpExceptionFilter,
  JwtAuthGuard,
  RolesGuard,
  TransformInterceptor,
} from '@grab/nestjs-common'
import { ClassSerializerInterceptor, Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core'
import { EventEmitterModule } from '@nestjs/event-emitter'
import { TerminusModule } from '@nestjs/terminus'

import { AppController } from './app.controller'
import { AppService } from './app.service'
import { AuthModule } from './auth/auth.module'
import { databaseConfig } from './config/database.config'
import { jwtConfig } from './config/jwt.config'
import { rabbitmqConfig } from './config/rabbitmq.config'
import { redisConfig } from './config/redis.config'
import { stripeConfig } from './config/stripe.config'
import { DatabaseModule } from './database/database.module'
import { PaymentModule } from './payments/payment.module'
import { RedisModule } from './redis/redis.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env', '../../.env.local', '../../.env'],
      load: [stripeConfig, redisConfig, rabbitmqConfig, databaseConfig, jwtConfig],
    }),
    EventEmitterModule.forRoot({ wildcard: false, delimiter: '.', maxListeners: 20 }),
    TerminusModule,
    DatabaseModule,
    RedisModule,
    AuthModule,
    PaymentModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    { provide: APP_INTERCEPTOR, useClass: ClassSerializerInterceptor },
  ],
})
export class AppModule {}
