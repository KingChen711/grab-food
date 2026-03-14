import { Public } from '@grab/nestjs-common'
import { Controller, Get } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import type { HealthIndicatorResult } from '@nestjs/terminus'
import { HealthCheck, HealthCheckService, TypeOrmHealthIndicator } from '@nestjs/terminus'

import { AppService } from './app.service'
import { KafkaProducerService } from './kafka/kafka-producer.service'

@ApiTags('health')
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
    private readonly kafka: KafkaProducerService,
  ) {}

  @Public()
  @Get('health')
  @HealthCheck()
  public check(): Promise<unknown> {
    return this.health.check([
      () => this.db.pingCheck('database'),
      (): HealthIndicatorResult => ({ kafka: { status: this.kafka.connected ? 'up' : 'down' } }),
    ])
  }

  @Public()
  @Get()
  public getStatus(): { status: string; service: string } {
    return this.appService.getStatus()
  }
}
