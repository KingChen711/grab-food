import { BullModule } from '@nestjs/bull'
import { Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { MongooseModule } from '@nestjs/mongoose'

import { OrdersModule } from '../orders/orders.module'
import { OrdersService } from '../orders/orders.service'
import { RabbitMQService } from './rabbitmq.service'
import { SAGA_TIMEOUT_QUEUE } from './saga.constants'
import { ORDERS_SERVICE_TOKEN, SagaOrchestratorService } from './saga-orchestrator.service'
import { SagaTimeoutProcessor } from './saga-timeout.processor'
import { SagaStateDocument, SagaStateSchema } from './schemas/saga-state.schema'

@Module({
  imports: [
    MongooseModule.forFeature([{ name: SagaStateDocument.name, schema: SagaStateSchema }]),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        redis: {
          host: config.get<string>('redis.host'),
          port: config.get<number>('redis.port'),
          password: config.get<string>('redis.password'),
        },
      }),
    }),
    BullModule.registerQueue({ name: SAGA_TIMEOUT_QUEUE }),
    // Import OrdersModule so we can inject OrdersService
    OrdersModule,
  ],
  providers: [
    RabbitMQService,
    {
      // Use a custom token to avoid a circular dependency between
      // OrdersModule (which emits OrderCreated) and SagaModule
      // (which listens to OrderCreated and calls back into OrdersService).
      provide: ORDERS_SERVICE_TOKEN,
      useExisting: OrdersService,
    },
    SagaOrchestratorService,
    SagaTimeoutProcessor,
  ],
  exports: [SagaOrchestratorService],
})
export class SagaModule {}
