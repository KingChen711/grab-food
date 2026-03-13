import { Public, Roles } from '@grab/nestjs-common'
import type { JwtPayload } from '@grab/types'
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger'

import { CurrentUser } from '../common/decorators/current-user.decorator'
import { CreateReviewDto, ReplyReviewDto } from './dto/create-review.dto'
import type { RestaurantReview } from './entities/restaurant-review.entity'
import { ReviewsService } from './reviews.service'

@ApiTags('reviews')
@ApiBearerAuth()
@Controller('restaurants/:restaurantId/reviews')
export class ReviewsController {
  constructor(@Inject(ReviewsService) private readonly reviewsService: ReviewsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List reviews for a restaurant' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200 })
  public async getReviews(
    @Param('restaurantId') restaurantId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<{ items: RestaurantReview[]; total: number }> {
    const [items, total] = await this.reviewsService.getReviews(
      restaurantId,
      page ?? 1,
      limit ?? 20,
    )
    return { items, total }
  }

  @Post()
  @Roles('customer')
  @ApiOperation({ summary: 'Submit a review (customer, one per order)' })
  @ApiResponse({ status: 201 })
  @ApiResponse({ status: 409, description: 'Already reviewed this order' })
  public createReview(
    @Param('restaurantId') restaurantId: string,
    @Body() dto: CreateReviewDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<RestaurantReview> {
    return this.reviewsService.createReview(restaurantId, dto, user)
  }

  @Patch(':reviewId/reply')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('restaurant_owner', 'admin')
  @ApiOperation({ summary: 'Owner reply to a review' })
  @ApiResponse({ status: 204 })
  public replyToReview(
    @Param('restaurantId') restaurantId: string,
    @Param('reviewId') reviewId: string,
    @Body() dto: ReplyReviewDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    return this.reviewsService.replyToReview(restaurantId, reviewId, dto, user)
  }
}
