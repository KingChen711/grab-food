import { ForbiddenException, NotFoundException } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'

import { Restaurant } from '../restaurants/entities/restaurant.entity'
import { MenuCategory } from './entities/menu-category.entity'
import { MenuItem } from './entities/menu-item.entity'
import { MenuItemAddon } from './entities/menu-item-addon.entity'
import { MenuItemVariant } from './entities/menu-item-variant.entity'
import { MenuService } from './menu.service'

const makeRepo = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
})

function makeRestaurant(overrides: Partial<Restaurant> = {}): Restaurant {
  return { id: 'rest-1', ownerId: 'user-1', ...overrides } as Restaurant
}

function makeCategory(overrides: Partial<MenuCategory> = {}): MenuCategory {
  return {
    id: 'cat-1',
    restaurantId: 'rest-1',
    name: 'Appetizers',
    sortOrder: 10,
    isActive: true,
    items: [],
    ...overrides,
  } as MenuCategory
}

function makeItem(overrides: Partial<MenuItem> = {}): MenuItem {
  return {
    id: 'item-1',
    restaurantId: 'rest-1',
    categoryId: 'cat-1',
    name: 'Spring Rolls',
    basePrice: 50000,
    isAvailable: true,
    variants: [],
    addons: [],
    ...overrides,
  } as MenuItem
}

const ownerPayload = { sub: 'user-1', role: 'restaurant_owner' } as any
const otherPayload = { sub: 'user-2', role: 'restaurant_owner' } as any

describe('MenuService', () => {
  let service: MenuService
  let restaurantRepo: ReturnType<typeof makeRepo>
  let categoryRepo: ReturnType<typeof makeRepo>
  let itemRepo: ReturnType<typeof makeRepo>
  let variantRepo: ReturnType<typeof makeRepo>
  let addonRepo: ReturnType<typeof makeRepo>
  let eventEmitter: { emit: jest.Mock }

  beforeEach(async () => {
    restaurantRepo = makeRepo()
    categoryRepo = makeRepo()
    itemRepo = makeRepo()
    variantRepo = makeRepo()
    addonRepo = makeRepo()
    eventEmitter = { emit: jest.fn() }

    const module = await Test.createTestingModule({
      providers: [
        MenuService,
        { provide: getRepositoryToken(Restaurant), useValue: restaurantRepo },
        { provide: getRepositoryToken(MenuCategory), useValue: categoryRepo },
        { provide: getRepositoryToken(MenuItem), useValue: itemRepo },
        { provide: getRepositoryToken(MenuItemVariant), useValue: variantRepo },
        { provide: getRepositoryToken(MenuItemAddon), useValue: addonRepo },
        { provide: EventEmitter2, useValue: eventEmitter },
        { provide: DataSource, useValue: {} },
      ],
    }).compile()

    service = module.get(MenuService)
  })

  // ── getCategories ─────────────────────────────────────────────────────────

  describe('getCategories', () => {
    it('returns all categories including inactive, with items grouped', async () => {
      const activeCategory = makeCategory({ id: 'cat-1', isActive: true })
      const hiddenCategory = makeCategory({ id: 'cat-2', name: 'Seasonal', isActive: false })
      const item = makeItem({ categoryId: 'cat-1' })

      categoryRepo.find.mockResolvedValue([activeCategory, hiddenCategory])
      itemRepo.find.mockResolvedValue([item])

      const result = await service.getCategories('rest-1')

      expect(result).toHaveLength(2)
      const cat1 = result.find((c) => c.id === 'cat-1')
      const cat2 = result.find((c) => c.id === 'cat-2')
      expect(cat1?.items).toHaveLength(1)
      expect(cat2?.items).toHaveLength(0)
    })

    it('returns empty array when restaurant has no categories', async () => {
      categoryRepo.find.mockResolvedValue([])

      const result = await service.getCategories('rest-1')

      expect(result).toEqual([])
      expect(itemRepo.find).not.toHaveBeenCalled()
    })
  })

  // ── getFullMenu ───────────────────────────────────────────────────────────

  describe('getFullMenu', () => {
    it('returns only active categories', async () => {
      const activeCategory = makeCategory({ id: 'cat-1', isActive: true })
      // Note: inactive category filtered at DB level via where: { isActive: true }
      categoryRepo.find.mockResolvedValue([activeCategory])
      itemRepo.find.mockResolvedValue([makeItem({ categoryId: 'cat-1' })])

      const result = await service.getFullMenu('rest-1')

      expect(result).toHaveLength(1)
      expect(result[0].isActive).toBe(true)
    })

    it('queries categories with isActive:true filter', async () => {
      categoryRepo.find.mockResolvedValue([])

      await service.getFullMenu('rest-1')

      expect(categoryRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isActive: true }),
        }),
      )
    })
  })

  // ── createCategory ────────────────────────────────────────────────────────

  describe('createCategory', () => {
    it('creates and returns the new category', async () => {
      restaurantRepo.findOne.mockResolvedValue(makeRestaurant({ ownerId: 'user-1' }))
      const created = makeCategory({ name: 'Desserts' })
      categoryRepo.create.mockReturnValue(created)
      categoryRepo.save.mockResolvedValue(created)

      const result = await service.createCategory('rest-1', { name: 'Desserts' }, ownerPayload)

      expect(categoryRepo.save).toHaveBeenCalled()
      expect(result.name).toBe('Desserts')
    })

    it('throws ForbiddenException when requester is not the restaurant owner', async () => {
      restaurantRepo.findOne.mockResolvedValue(makeRestaurant({ ownerId: 'user-1' }))

      await expect(
        service.createCategory('rest-1', { name: 'Desserts' }, otherPayload),
      ).rejects.toThrow(ForbiddenException)
    })

    it('throws NotFoundException when restaurant does not exist', async () => {
      restaurantRepo.findOne.mockResolvedValue(null)

      await expect(
        service.createCategory('nonexistent', { name: 'Desserts' }, ownerPayload),
      ).rejects.toThrow(NotFoundException)
    })
  })

  // ── updateCategory ────────────────────────────────────────────────────────

  describe('updateCategory', () => {
    it('calls repo.update with provided dto fields', async () => {
      restaurantRepo.findOne.mockResolvedValue(makeRestaurant({ ownerId: 'user-1' }))
      categoryRepo.findOne.mockResolvedValue(makeCategory({ name: 'Old Name' }))
      categoryRepo.update.mockResolvedValue(undefined)

      await service.updateCategory('rest-1', 'cat-1', { name: 'New Name' }, ownerPayload)

      expect(categoryRepo.update).toHaveBeenCalledWith(
        'cat-1',
        expect.objectContaining({ name: 'New Name' }),
      )
    })

    it('throws NotFoundException when category belongs to different restaurant', async () => {
      restaurantRepo.findOne.mockResolvedValue(makeRestaurant({ ownerId: 'user-1' }))
      categoryRepo.findOne.mockResolvedValue(null)

      await expect(
        service.updateCategory('rest-1', 'wrong-cat', { name: 'x' }, ownerPayload),
      ).rejects.toThrow(NotFoundException)
    })
  })
})
