import type { JwtPayload } from '@grab/types'
import { ForbiddenException, NotFoundException } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'

import type { CreateRestaurantDto } from './dto/create-restaurant.dto'
import { OperatingHours } from './entities/operating-hours.entity'
import { Restaurant } from './entities/restaurant.entity'
import { RestaurantsService } from './restaurants.service'

const makeRepo = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  remove: jest.fn(),
  increment: jest.fn(),
})

function makeRestaurant(overrides: Partial<Restaurant> = {}): Restaurant {
  return {
    id: 'rest-1',
    ownerId: 'user-1',
    name: 'Pizza Palace',
    slug: 'pizza-palace',
    status: 'pending',
    isOpen: false,
    ...overrides,
  } as Restaurant
}

const owner = { sub: 'user-1', role: 'restaurant_owner' } as JwtPayload
const otherOwner = { sub: 'user-2', role: 'restaurant_owner' } as JwtPayload
const admin = { sub: 'admin-1', role: 'admin' } as JwtPayload

describe('RestaurantsService', () => {
  let service: RestaurantsService
  let restaurantRepo: ReturnType<typeof makeRepo>
  let hoursRepo: ReturnType<typeof makeRepo>
  let eventEmitter: { emit: jest.Mock }
  let dataSource: { transaction: jest.Mock }

  beforeEach(async () => {
    restaurantRepo = makeRepo()
    hoursRepo = makeRepo()
    eventEmitter = { emit: jest.fn() }
    dataSource = { transaction: jest.fn() }

    const module = await Test.createTestingModule({
      providers: [
        RestaurantsService,
        { provide: getRepositoryToken(Restaurant), useValue: restaurantRepo },
        { provide: getRepositoryToken(OperatingHours), useValue: hoursRepo },
        { provide: EventEmitter2, useValue: eventEmitter },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile()

    service = module.get(RestaurantsService)
  })

  afterEach(() => jest.clearAllMocks())

  // ─── create ──────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('creates a pending restaurant inside a transaction and emits restaurant.created', async () => {
      const dto = {
        name: 'Pizza Palace',
        fullAddress: '1 Le Loi',
        city: 'HCMC',
        country: 'VN',
        lat: 10.77,
        lng: 106.7,
        phone: '+84900000000',
        cuisineTypes: ['italian'],
        priceRange: 2,
      } as unknown as CreateRestaurantDto

      const manager = {
        create: jest.fn((_entity, data) => data),
        save: jest.fn(async (entity) => ({ id: 'rest-1', ...entity })),
      }
      dataSource.transaction.mockImplementation(async (cb) => cb(manager))

      // 1st findOne = slug uniqueness check, 2nd findOne = findById after save
      restaurantRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(makeRestaurant({ status: 'pending' }))

      const result = await service.create(dto, owner)

      expect(manager.create).toHaveBeenCalledWith(
        Restaurant,
        expect.objectContaining({ ownerId: 'user-1', slug: 'pizza-palace', status: 'pending' }),
      )
      expect(eventEmitter.emit).toHaveBeenCalledWith('restaurant.created', {
        restaurantId: 'rest-1',
        ownerId: 'user-1',
      })
      expect(result.id).toBe('rest-1')
    })
  })

  // ─── findById ────────────────────────────────────────────────────────────────

  describe('findById', () => {
    it('throws NotFoundException when the restaurant does not exist', async () => {
      restaurantRepo.findOne.mockResolvedValueOnce(null)
      await expect(service.findById('nope')).rejects.toThrow(NotFoundException)
    })
  })

  // ─── Approval workflow ─────────────────────────────────────────────────────────

  describe('approval workflow', () => {
    it('approve sets status active, stamps approver and clears rejection reason', async () => {
      restaurantRepo.findOne.mockResolvedValueOnce(makeRestaurant())

      await service.approve('rest-1', 'admin-1')

      expect(restaurantRepo.update).toHaveBeenCalledWith(
        'rest-1',
        expect.objectContaining({ status: 'active', approvedBy: 'admin-1', rejectionReason: null }),
      )
      expect(eventEmitter.emit).toHaveBeenCalledWith('restaurant.approved', {
        restaurantId: 'rest-1',
        adminId: 'admin-1',
      })
    })

    it('reject keeps status pending and records the rejection reason', async () => {
      restaurantRepo.findOne.mockResolvedValueOnce(makeRestaurant())

      await service.reject('rest-1', 'admin-1', 'Incomplete documents')

      expect(restaurantRepo.update).toHaveBeenCalledWith(
        'rest-1',
        expect.objectContaining({ status: 'pending', rejectionReason: 'Incomplete documents' }),
      )
    })

    it('suspend sets status suspended and emits restaurant.suspended', async () => {
      restaurantRepo.findOne.mockResolvedValueOnce(makeRestaurant({ status: 'active' }))

      await service.suspend('rest-1', 'admin-1')

      expect(restaurantRepo.update).toHaveBeenCalledWith('rest-1', { status: 'suspended' })
      expect(eventEmitter.emit).toHaveBeenCalledWith('restaurant.suspended', {
        restaurantId: 'rest-1',
        adminId: 'admin-1',
      })
    })

    it('approve throws NotFoundException for an unknown restaurant', async () => {
      restaurantRepo.findOne.mockResolvedValueOnce(null)
      await expect(service.approve('nope', 'admin-1')).rejects.toThrow(NotFoundException)
    })
  })

  // ─── Ownership / authorization ─────────────────────────────────────────────────

  describe('ownership enforcement', () => {
    it('update rejects a requester who does not own the restaurant', async () => {
      restaurantRepo.findOne.mockResolvedValueOnce(makeRestaurant({ ownerId: 'user-1' }))

      await expect(
        service.update('rest-1', { name: 'Hacked' } as never, otherOwner),
      ).rejects.toThrow(ForbiddenException)
      expect(restaurantRepo.update).not.toHaveBeenCalled()
    })

    it('remove lets an admin delete any restaurant', async () => {
      const restaurant = makeRestaurant({ ownerId: 'user-1' })
      restaurantRepo.findOne.mockResolvedValueOnce(restaurant)

      await service.remove('rest-1', admin)

      expect(restaurantRepo.remove).toHaveBeenCalledWith(restaurant)
      expect(eventEmitter.emit).toHaveBeenCalledWith('restaurant.deleted', {
        restaurantId: 'rest-1',
      })
    })

    it('remove rejects a non-owner non-admin', async () => {
      restaurantRepo.findOne.mockResolvedValueOnce(makeRestaurant({ ownerId: 'user-1' }))
      await expect(service.remove('rest-1', otherOwner)).rejects.toThrow(ForbiddenException)
      expect(restaurantRepo.remove).not.toHaveBeenCalled()
    })
  })

  // ─── toggleOpen ────────────────────────────────────────────────────────────────

  describe('toggleOpen', () => {
    it('flips the isOpen flag for the owner', async () => {
      restaurantRepo.findOne.mockResolvedValueOnce(makeRestaurant({ isOpen: false }))

      await service.toggleOpen('rest-1', owner)

      expect(restaurantRepo.update).toHaveBeenCalledWith('rest-1', { isOpen: true })
    })
  })
})
