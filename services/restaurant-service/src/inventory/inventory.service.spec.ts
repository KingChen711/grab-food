import { NotFoundException } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'

import { Inventory } from './entities/inventory.entity'
import { InventoryService } from './inventory.service'

const RESTAURANT_ID = 'rest-1'
const ITEM_ID = 'item-1'

function makeInventory(overrides: Partial<Inventory> = {}): Inventory {
  return {
    restaurantId: RESTAURANT_ID,
    itemId: ITEM_ID,
    quantity: 10,
    lowStockThreshold: 5,
    isTracked: true,
    ...overrides,
  } as Inventory
}

describe('InventoryService', () => {
  let service: InventoryService
  let repo: { findOne: jest.Mock; create: jest.Mock; save: jest.Mock; find: jest.Mock }
  let eventEmitter: { emit: jest.Mock }

  beforeEach(async () => {
    repo = {
      findOne: jest.fn(),
      create: jest.fn((x: unknown) => x),
      save: jest.fn((x: unknown) => Promise.resolve(x)),
      find: jest.fn(),
    }
    eventEmitter = { emit: jest.fn() }

    const module = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: getRepositoryToken(Inventory), useValue: repo },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile()

    service = module.get(InventoryService)
  })

  afterEach(() => jest.clearAllMocks())

  // ─── upsert ──────────────────────────────────────────────────────────────────

  describe('upsert', () => {
    it('creates a new inventory row with defaults when none exists', async () => {
      repo.findOne.mockResolvedValueOnce(null)

      await service.upsert(RESTAURANT_ID, ITEM_ID, 20)

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ quantity: 20, lowStockThreshold: 5, isTracked: false }),
      )
      expect(repo.save).toHaveBeenCalled()
    })

    it('updates an existing row in place', async () => {
      const existing = makeInventory({ quantity: 10 })
      repo.findOne.mockResolvedValueOnce(existing)

      await service.upsert(RESTAURANT_ID, ITEM_ID, 3, 2, true)

      expect(repo.create).not.toHaveBeenCalled()
      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ quantity: 3, lowStockThreshold: 2, isTracked: true }),
      )
    })

    it('emits low_stock when a tracked item drops to/below threshold', async () => {
      repo.findOne.mockResolvedValueOnce(null)

      await service.upsert(RESTAURANT_ID, ITEM_ID, 2, 5, true)

      expect(eventEmitter.emit).toHaveBeenCalledWith('inventory.low_stock', {
        restaurantId: RESTAURANT_ID,
        itemId: ITEM_ID,
        quantity: 2,
      })
    })

    it('emits both low_stock and out_of_stock when a tracked item hits zero', async () => {
      repo.findOne.mockResolvedValueOnce(null)

      await service.upsert(RESTAURANT_ID, ITEM_ID, 0, 5, true)

      expect(eventEmitter.emit).toHaveBeenCalledWith('inventory.low_stock', expect.anything())
      expect(eventEmitter.emit).toHaveBeenCalledWith('inventory.out_of_stock', {
        restaurantId: RESTAURANT_ID,
        itemId: ITEM_ID,
      })
    })

    it('does not emit stock events for an untracked item', async () => {
      repo.findOne.mockResolvedValueOnce(null)

      await service.upsert(RESTAURANT_ID, ITEM_ID, 0, 5, false)

      expect(eventEmitter.emit).not.toHaveBeenCalled()
    })
  })

  // ─── decrement ─────────────────────────────────────────────────────────────────

  describe('decrement', () => {
    it('ignores untracked items', async () => {
      repo.findOne.mockResolvedValueOnce(makeInventory({ isTracked: false }))

      await service.decrement(ITEM_ID, 1)

      expect(repo.save).not.toHaveBeenCalled()
      expect(eventEmitter.emit).not.toHaveBeenCalled()
    })

    it('ignores a missing inventory row', async () => {
      repo.findOne.mockResolvedValueOnce(null)
      await service.decrement(ITEM_ID, 1)
      expect(repo.save).not.toHaveBeenCalled()
    })

    it('decrements, clamps at zero and emits out_of_stock', async () => {
      repo.findOne.mockResolvedValueOnce(makeInventory({ quantity: 1, lowStockThreshold: 5 }))

      await service.decrement(ITEM_ID, 3)

      expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ quantity: 0 }))
      expect(eventEmitter.emit).toHaveBeenCalledWith('inventory.out_of_stock', {
        restaurantId: RESTAURANT_ID,
        itemId: ITEM_ID,
      })
    })
  })

  // ─── findByItem ──────────────────────────────────────────────────────────────

  describe('findByItem', () => {
    it('throws NotFoundException when no inventory exists for the item', async () => {
      repo.findOne.mockResolvedValueOnce(null)
      await expect(service.findByItem('ghost')).rejects.toThrow(NotFoundException)
    })
  })
})
