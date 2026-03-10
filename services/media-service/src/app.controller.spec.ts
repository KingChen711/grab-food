import { HealthCheckService } from '@nestjs/terminus'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'

import { AppController } from './app.controller'
import { AppService } from './app.service'

const mockHealthCheckService = {
  check: jest.fn().mockResolvedValue({ status: 'ok' }),
}

describe('AppController', () => {
  let appController: AppController

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService, { provide: HealthCheckService, useValue: mockHealthCheckService }],
    }).compile()

    appController = app.get<AppController>(AppController)
  })

  describe('getStatus', () => {
    it('should return service status', () => {
      expect(appController.getStatus()).toEqual({
        status: 'ok',
        service: 'media-service',
      })
    })
  })
})
