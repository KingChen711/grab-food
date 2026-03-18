import { HttpExceptionFilter, TransformInterceptor } from '@grab/nestjs-common'
import { ClassSerializerInterceptor, Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core'
import { EventEmitterModule } from '@nestjs/event-emitter'
import { TerminusModule } from '@nestjs/terminus'

import { AppController } from './app.controller'
import { AppService } from './app.service'
import { CartModule } from './cart/cart.module'
import { databaseConfig } from './config/database.config'
import { mongoConfig } from './config/mongodb.config'
import { redisConfig } from './config/redis.config'
import { DatabaseModule } from './database/database.module'
import { MongoModule } from './database/mongo.module'
import { OrdersModule } from './orders/orders.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      load: [databaseConfig, mongoConfig, redisConfig],
    }),
    EventEmitterModule.forRoot(),
    DatabaseModule,
    MongoModule,
    OrdersModule,
    CartModule,
    TerminusModule,
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
