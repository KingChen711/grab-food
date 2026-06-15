import type { JwtPayload } from '@grab/types'
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'

import { Restaurant } from '../restaurants/entities/restaurant.entity'
import type { CreateReviewDto } from './dto/create-review.dto'
import { RestaurantReview } from './entities/restaurant-review.entity'
import { ReviewsService } from './reviews.service'

const RESTAURANT_ID = 'rest-1'
const requester = { sub: 'user-1', role: 'customer' } as JwtPayload
const ownerRequester = { sub: 'owner-1', role: 'restaurant_owner' } as JwtPayload

function makeReviewRepo() {
  return {
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    create: jest.fn((x: unknown) => x),
    save: jest.fn((x: unknown) => Promise.resolve({ id: 'review-1', ...(x as object) })),
    update: jest.fn().mockResolvedValue(undefined),
    createQueryBuilder: jest.fn(),
  }
}

describe('ReviewsService', () => {
  let service: ReviewsService
  let reviewRepo: ReturnType<typeof makeReviewRepo>
  let restaurantRepo: { findOne: jest.Mock; update: jest.Mock }
  let eventEmitter: { emit: jest.Mock }

  beforeEach(async () => {
    reviewRepo = makeReviewRepo()
    restaurantRepo = { findOne: jest.fn(), update: jest.fn().mockResolvedValue(undefined) }
    eventEmitter = { emit: jest.fn() }

    const module = await Test.createTestingModule({
      providers: [
        ReviewsService,
        { provide: getRepositoryToken(RestaurantReview), useValue: reviewRepo },
        { provide: getRepositoryToken(Restaurant), useValue: restaurantRepo },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile()

    service = module.get(ReviewsService)
  })

  afterEach(() => jest.clearAllMocks())

  // ─── createReview ─────────────────────────────────────────────────────────────

  describe('createReview', () => {
    const dto = { orderId: 'order-1', rating: 5, comment: 'Great!' } as CreateReviewDto

    it('rejects a second review for the same order', async () => {
      reviewRepo.findOne.mockResolvedValueOnce({ id: 'existing' })

      await expect(service.createReview(RESTAURANT_ID, dto, requester)).rejects.toThrow(
        ConflictException,
      )
    })

    it('saves the review, recalculates the rating and emits rating.updated', async () => {
      reviewRepo.findOne.mockResolvedValueOnce(null)
      reviewRepo.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ avg: '4.5', count: '2' }),
      })

      const saved = await service.createReview(RESTAURANT_ID, dto, requester)

      expect(saved.id).toBe('review-1')
      // recalculateRating rounds the average and writes the new aggregate to the restaurant
      expect(restaurantRepo.update).toHaveBeenCalledWith(RESTAURANT_ID, {
        avgRating: 4.5,
        totalReviews: 2,
      })
      expect(eventEmitter.emit).toHaveBeenCalledWith('restaurant.rating.updated', {
        restaurantId: RESTAURANT_ID,
      })
    })
  })

  // ─── replyToReview ─────────────────────────────────────────────────────────────

  describe('replyToReview', () => {
    it('throws NotFoundException when the restaurant is missing', async () => {
      restaurantRepo.findOne.mockResolvedValueOnce(null)

      await expect(
        service.replyToReview(RESTAURANT_ID, 'review-1', { reply: 'Thanks' }, ownerRequester),
      ).rejects.toThrow(NotFoundException)
    })

    it('rejects a requester who is neither owner nor admin', async () => {
      restaurantRepo.findOne.mockResolvedValueOnce({ id: RESTAURANT_ID, ownerId: 'someone-else' })

      await expect(
        service.replyToReview(RESTAURANT_ID, 'review-1', { reply: 'Thanks' }, ownerRequester),
      ).rejects.toThrow(ForbiddenException)
    })

    it('lets the owner reply and persists the reply with a timestamp', async () => {
      restaurantRepo.findOne.mockResolvedValueOnce({ id: RESTAURANT_ID, ownerId: 'owner-1' })
      reviewRepo.findOne.mockResolvedValueOnce({ id: 'review-1', restaurantId: RESTAURANT_ID })

      await service.replyToReview(RESTAURANT_ID, 'review-1', { reply: 'Thanks!' }, ownerRequester)

      expect(reviewRepo.update).toHaveBeenCalledWith(
        'review-1',
        expect.objectContaining({ ownerReply: 'Thanks!', ownerRepliedAt: expect.any(Date) }),
      )
    })

    it('throws NotFoundException when the review does not exist', async () => {
      restaurantRepo.findOne.mockResolvedValueOnce({ id: RESTAURANT_ID, ownerId: 'owner-1' })
      reviewRepo.findOne.mockResolvedValueOnce(null)

      await expect(
        service.replyToReview(RESTAURANT_ID, 'ghost', { reply: 'Thanks' }, ownerRequester),
      ).rejects.toThrow(NotFoundException)
    })
  })
})
