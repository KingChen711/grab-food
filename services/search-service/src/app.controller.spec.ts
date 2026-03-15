import { HealthCheckService } from '@nestjs/terminus'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'

import { AppController } from './app.controller'
import { AppService } from './app.service'
import { ELASTICSEARCH_CLIENT } from './search/search.service'

const mockHealthCheckService = {
  check: jest.fn().mockResolvedValue({ status: 'ok' }),
}

const mockEsClient = {
  ping: jest.fn().mockResolvedValue(true),
}

describe('AppController', () => {
  let appController: AppController

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        { provide: HealthCheckService, useValue: mockHealthCheckService },
        { provide: ELASTICSEARCH_CLIENT, useValue: mockEsClient },
      ],
    }).compile()

    appController = app.get<AppController>(AppController)
  })

  describe('getStatus', () => {
    it('should return service status', () => {
      expect(appController.getStatus()).toEqual({
        status: 'ok',
        service: 'search-service',
      })
    })
  })
})
