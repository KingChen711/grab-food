import { Controller, Get } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { HealthCheck, HealthCheckService, TypeOrmHealthIndicator } from '@nestjs/terminus'

import { AppService } from './app.service'

@ApiTags('health')
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
  ) {}

  @Get('health')
  @HealthCheck()
  public check(): Promise<unknown> {
    return this.health.check([() => this.db.pingCheck('database')])
  }

  @Get()
  public getStatus(): { status: string; service: string } {
    return this.appService.getStatus()
  }
}
