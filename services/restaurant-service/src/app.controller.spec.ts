import { HealthCheckService, TypeOrmHealthIndicator } from '@nestjs/terminus'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'

import { AppController } from './app.controller'
import { AppService } from './app.service'
import { KafkaProducerService } from './kafka/kafka-producer.service'

const mockHealthCheckService = {
  check: jest.fn().mockResolvedValue({ status: 'ok' }),
}

const mockTypeOrmIndicator = {
  pingCheck: jest.fn().mockResolvedValue({ database: { status: 'up' } }),
}

const mockKafkaProducer = {
  connected: true,
}

describe('AppController', () => {
  let appController: AppController

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        { provide: HealthCheckService, useValue: mockHealthCheckService },
        { provide: TypeOrmHealthIndicator, useValue: mockTypeOrmIndicator },
        { provide: KafkaProducerService, useValue: mockKafkaProducer },
      ],
    }).compile()

    appController = app.get<AppController>(AppController)
  })

  describe('getStatus', () => {
    it('should return service status', () => {
      expect(appController.getStatus()).toEqual({
        status: 'ok',
        service: 'restaurant-service',
      })
    })
  })
})
