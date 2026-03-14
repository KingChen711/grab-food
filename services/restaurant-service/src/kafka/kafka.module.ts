import { Module } from '@nestjs/common'

import { MenuModule } from '../menu/menu.module'
import { RestaurantsModule } from '../restaurants/restaurants.module'
import { KafkaProducerService } from './kafka-producer.service'
import { RestaurantEventsListener } from './restaurant-events.listener'

@Module({
  imports: [RestaurantsModule, MenuModule],
  providers: [KafkaProducerService, RestaurantEventsListener],
  exports: [KafkaProducerService],
})
export class KafkaModule {}
