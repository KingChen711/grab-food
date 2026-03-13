import { Public } from '@grab/nestjs-common'
import { Controller, Get, Inject } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { HealthCheck, HealthCheckService } from '@nestjs/terminus'

import { AppService } from './app.service'

@ApiTags('health')
@Controller()
export class AppController {
  constructor(
    @Inject(AppService) private readonly appService: AppService,
    @Inject(HealthCheckService) private readonly health: HealthCheckService,
  ) {}

  @Public()
  @Get('health')
  @HealthCheck()
  public check(): Promise<unknown> {
    return this.health.check([])
  }

  @Public()
  @Get()
  public getStatus(): { status: string; service: string } {
    return this.appService.getStatus()
  }
}
