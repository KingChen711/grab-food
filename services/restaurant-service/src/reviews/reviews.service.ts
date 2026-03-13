import type { JwtPayload } from '@grab/types'
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { Restaurant } from '../restaurants/entities/restaurant.entity'
import type { CreateReviewDto, ReplyReviewDto } from './dto/create-review.dto'
import { RestaurantReview } from './entities/restaurant-review.entity'

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name)

  constructor(
    @InjectRepository(RestaurantReview)
    private readonly reviewRepo: Repository<RestaurantReview>,
    @InjectRepository(Restaurant)
    private readonly restaurantRepo: Repository<Restaurant>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  public async getReviews(
    restaurantId: string,
    page = 1,
    limit = 20,
  ): Promise<[RestaurantReview[], number]> {
    return this.reviewRepo.findAndCount({
      where: { restaurantId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    })
  }

  public async createReview(
    restaurantId: string,
    dto: CreateReviewDto,
    requester: JwtPayload,
  ): Promise<RestaurantReview> {
    const existing = await this.reviewRepo.findOne({
      where: { restaurantId, orderId: dto.orderId },
    })
    if (existing) throw new ConflictException('You have already reviewed this order')

    const review = this.reviewRepo.create({
      restaurantId,
      userId: requester.sub,
      orderId: dto.orderId,
      rating: dto.rating,
      comment: dto.comment ?? null,
      images: dto.images ?? null,
    })

    const saved = await this.reviewRepo.save(review)
    this.logger.log(`Review created: ${saved.id} for restaurant ${restaurantId}`)

    await this.recalculateRating(restaurantId)
    this.eventEmitter.emit('restaurant.rating.updated', { restaurantId })

    return saved
  }

  public async replyToReview(
    restaurantId: string,
    reviewId: string,
    dto: ReplyReviewDto,
    requester: JwtPayload,
  ): Promise<void> {
    const restaurant = await this.restaurantRepo.findOne({ where: { id: restaurantId } })
    if (!restaurant) throw new NotFoundException(`Restaurant ${restaurantId} not found`)
    if (restaurant.ownerId !== requester.sub && requester.role !== 'admin') {
      throw new ForbiddenException('Only the restaurant owner can reply to reviews')
    }

    const review = await this.reviewRepo.findOne({ where: { id: reviewId, restaurantId } })
    if (!review) throw new NotFoundException(`Review ${reviewId} not found`)

    await this.reviewRepo.update(reviewId, {
      ownerReply: dto.reply,
      ownerRepliedAt: new Date(),
    })
  }

  // ─── Private ──────────────────────────────────────────────────────────────

  private async recalculateRating(restaurantId: string): Promise<void> {
    const result = await this.reviewRepo
      .createQueryBuilder('r')
      .select('AVG(r.rating)', 'avg')
      .addSelect('COUNT(r.id)', 'count')
      .where('r.restaurantId = :restaurantId', { restaurantId })
      .getRawOne<{ avg: string; count: string }>()

    if (!result) return

    const avg = parseFloat(result.avg ?? '0')
    const count = parseInt(result.count ?? '0', 10)

    await this.restaurantRepo.update(restaurantId, {
      avgRating: Math.round(avg * 100) / 100,
      totalReviews: count,
    })
  }
}
