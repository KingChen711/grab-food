import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { Restaurant } from '../restaurants/entities/restaurant.entity'
import { RestaurantReview } from './entities/restaurant-review.entity'
import { ReviewsController } from './reviews.controller'
import { ReviewsService } from './reviews.service'

@Module({
  imports: [TypeOrmModule.forFeature([RestaurantReview, Restaurant])],
  controllers: [ReviewsController],
  providers: [ReviewsService],
  exports: [ReviewsService],
})
export class ReviewsModule {}
