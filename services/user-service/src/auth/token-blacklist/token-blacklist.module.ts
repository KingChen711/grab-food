import { Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Redis from 'ioredis'

import { REDIS_CLIENT, TokenBlacklistService } from './token-blacklist.service'

@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        return new Redis({
          host: config.get<string>('redis.host'),
          port: config.get<number>('redis.port'),
          password: config.get<string>('redis.password'),
        })
      },
    },
    TokenBlacklistService,
  ],
  exports: [TokenBlacklistService],
})
export class TokenBlacklistModule {}
