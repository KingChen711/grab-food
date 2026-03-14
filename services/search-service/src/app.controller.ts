import type { Client } from '@elastic/elasticsearch'
import { Controller, Get, Inject } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { HealthCheck, HealthCheckService, HealthIndicatorResult } from '@nestjs/terminus'

import { AppService } from './app.service'
import { ELASTICSEARCH_CLIENT } from './search/search.service'

@ApiTags('health')
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly health: HealthCheckService,
    @Inject(ELASTICSEARCH_CLIENT) private readonly esClient: Client,
  ) {}

  @Get('health')
  @HealthCheck()
  public check(): Promise<unknown> {
    return this.health.check([
      async (): Promise<HealthIndicatorResult> => {
        try {
          await this.esClient.ping()
          return { elasticsearch: { status: 'up' } }
        } catch {
          return { elasticsearch: { status: 'down' } }
        }
      },
    ])
  }

  @Get()
  public getStatus(): { status: string; service: string } {
    return this.appService.getStatus()
  }
}
