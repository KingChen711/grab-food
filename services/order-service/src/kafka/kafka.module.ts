import { Module } from '@nestjs/common'

import { KafkaProducerService } from './kafka-producer.service'
import { OrderEventsListener } from './order-events.listener'

@Module({
  providers: [KafkaProducerService, OrderEventsListener],
  exports: [KafkaProducerService],
})
export class KafkaModule {}
