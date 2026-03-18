import { Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Redis from 'ioredis'

import { REDIS_CLIENT } from './cart.constants'
import { CartController } from './cart.controller'
import { CartService } from './cart.service'

@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService): Redis => {
        return new Redis({
          host: config.get<string>('redis.host'),
          port: config.get<number>('redis.port'),
          password: config.get<string>('redis.password'),
          // Reconnect automatically; fail fast on first connect failure
          lazyConnect: false,
          maxRetriesPerRequest: 3,
        })
      },
    },
    CartService,
  ],
  controllers: [CartController],
  exports: [CartService],
})
export class CartModule {}
