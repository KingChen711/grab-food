import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { OperatingHours } from './entities/operating-hours.entity'
import { Restaurant } from './entities/restaurant.entity'
import { RestaurantsController } from './restaurants.controller'
import { RestaurantsService } from './restaurants.service'

@Module({
  imports: [TypeOrmModule.forFeature([Restaurant, OperatingHours])],
  controllers: [RestaurantsController],
  providers: [RestaurantsService],
  exports: [RestaurantsService],
})
export class RestaurantsModule {}
