import { HealthCheckService, TypeOrmHealthIndicator } from '@nestjs/terminus'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'

import { AppController } from './app.controller'
import { AppService } from './app.service'

const mockHealthCheckService = {
  check: jest.fn().mockResolvedValue({ status: 'ok' }),
}

const mockTypeOrmHealthIndicator = {
  pingCheck: jest.fn().mockResolvedValue({ database: { status: 'up' } }),
}

describe('AppController', () => {
  let appController: AppController

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        { provide: HealthCheckService, useValue: mockHealthCheckService },
        { provide: TypeOrmHealthIndicator, useValue: mockTypeOrmHealthIndicator },
      ],
    }).compile()

    appController = app.get<AppController>(AppController)
  })

  describe('getStatus', () => {
    it('should return service status', () => {
      expect(appController.getStatus()).toEqual({
        status: 'ok',
        service: 'payment-service',
      })
    })
  })
})
