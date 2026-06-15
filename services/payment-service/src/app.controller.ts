import { Public } from '@grab/nestjs-common'
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

  @Public()
  @Get('health')
  @HealthCheck()
  public check(): Promise<unknown> {
    // Dependencies are wired up in later tasks — keep this in step with what exists:
    //   TODO: adds the DB ping; redis / rabbitmq / stripe checks land with their modules.
    return this.health.check([() => this.db.pingCheck('database')])
  }

  @Public()
  @Get()
  public getStatus(): { status: string; service: string } {
    return this.appService.getStatus()
  }
}
