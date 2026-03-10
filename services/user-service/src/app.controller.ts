import { Controller, Get } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import type { HealthCheckService } from '@nestjs/terminus'
import { HealthCheck } from '@nestjs/terminus'

import type { AppService } from './app.service'
import { Public } from './common/decorators/public.decorator'

@ApiTags('health')
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly health: HealthCheckService,
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
