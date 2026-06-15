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
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'

import { AppController } from './app.controller'
import { AppService } from './app.service'
import { AuthModule } from './auth/auth.module'
import { databaseConfig } from './config/database.config'
import { jwtConfig } from './config/jwt.config'
import { redisConfig } from './config/redis.config'
import { DatabaseModule } from './database/database.module'
import { InventoryModule } from './inventory/inventory.module'
import { KafkaModule } from './kafka/kafka.module'
import { MenuModule } from './menu/menu.module'
import { RestaurantsModule } from './restaurants/restaurants.module'
import { ReviewsModule } from './reviews/reviews.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env', '../../.env.local', '../../.env'],
      load: [databaseConfig, jwtConfig, redisConfig],
    }),
    EventEmitterModule.forRoot({ wildcard: false, delimiter: '.', maxListeners: 20 }),
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 5 },
      { name: 'medium', ttl: 10_000, limit: 20 },
      { name: 'long', ttl: 60_000, limit: 100 },
    ]),
    DatabaseModule,
    TerminusModule,
    AuthModule,
    RestaurantsModule,
    MenuModule,
    InventoryModule,
    ReviewsModule,
    KafkaModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    { provide: APP_INTERCEPTOR, useClass: ClassSerializerInterceptor },
  ],
})
export class AppModule {}
