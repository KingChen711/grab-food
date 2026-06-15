import { NotFoundException } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'

import { OrderAggregate } from './domain/order.aggregate'
import type { CreateOrderDto } from './dto/create-order.dto'
import { EventStoreService } from './event-store/event-store.service'
import { OrdersService } from './orders.service'
import { OrderRead } from './projections/entities/order-read.entity'

// ─── Fixtures ───────────────────────────────────────────────────────────────────

const CUSTOMER_ID = '00000000-0000-0000-0000-000000000001'
const OTHER_CUSTOMER = '00000000-0000-0000-0000-000000000002'

const createOrderDto: CreateOrderDto = {
  restaurantId: '00000000-0000-0000-0000-000000000010',
  restaurantName: 'Pizza Palace',
  items: [
    {
      menuItemId: '00000000-0000-0000-0000-000000000020',
      menuItemName: 'Margherita',
      unitPrice: 100_000,
      quantity: 2,
    },
  ],
  subtotal: 200_000,
  deliveryFee: 15_000,
  tax: 5_000,
  total: 220_000,
  deliveryAddress: { address: '1 Le Loi', lat: 10.77, lng: 106.7 },
}

/** A CREATED aggregate with no pending events, mimicking one freshly loaded from the store. */
function loadedOrder(): OrderAggregate {
  const agg = OrderAggregate.create(
    'order-1',
    CUSTOMER_ID,
    createOrderDto.restaurantId,
    createOrderDto.restaurantName,
    [],
    200_000,
    15_000,
    5_000,
    220_000,
    createOrderDto.deliveryAddress,
  )
  agg.clearUncommittedEvents()
  return agg
}

// ─── Tests ──────────────────────────────────────────────────────────────────────

describe('OrdersService', () => {
  let service: OrdersService
  let eventStore: jest.Mocked<Pick<EventStoreService, 'load' | 'append'>>
  let eventEmitter: jest.Mocked<Pick<EventEmitter2, 'emit'>>
  let orderReadRepo: { findOne: jest.Mock; find: jest.Mock }

  beforeEach(async () => {
    eventStore = { load: jest.fn(), append: jest.fn().mockResolvedValue(undefined) }
    eventEmitter = { emit: jest.fn() }
    orderReadRepo = { findOne: jest.fn(), find: jest.fn() }

    const module = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: EventStoreService, useValue: eventStore },
        { provide: EventEmitter2, useValue: eventEmitter },
        { provide: getRepositoryToken(OrderRead), useValue: orderReadRepo },
      ],
    }).compile()

    service = module.get(OrdersService)
  })

  afterEach(() => jest.clearAllMocks())

  // ─── createOrder ───────────────────────────────────────────────────────────────

  describe('createOrder', () => {
    it('appends a CREATED aggregate and emits OrderCreated', async () => {
      const { orderId } = await service.createOrder(CUSTOMER_ID, createOrderDto)

      expect(orderId).toMatch(/^[0-9a-f-]{36}$/)
      expect(eventStore.append).toHaveBeenCalledTimes(1)

      const appended = eventStore.append.mock.calls[0][0] as OrderAggregate
      expect(appended.status).toBe('CREATED')
      expect(appended.customerId).toBe(CUSTOMER_ID)
      expect(eventEmitter.emit).toHaveBeenCalledWith('OrderCreated', expect.anything())
    })

    it('computes per-item total price from unit price × quantity', async () => {
      await service.createOrder(CUSTOMER_ID, createOrderDto)
      const appended = eventStore.append.mock.calls[0][0] as OrderAggregate
      expect(appended.items[0].totalPrice).toBe(200_000)
    })
  })

  // ─── State transitions ───────────────────────────────────────────────────────

  describe('confirmOrder', () => {
    it('loads the aggregate, confirms it and emits OrderConfirmed', async () => {
      eventStore.load.mockResolvedValueOnce(loadedOrder())

      await service.confirmOrder('order-1', { estimatedPrepTimeMinutes: 20 })

      const appended = eventStore.append.mock.calls[0][0] as OrderAggregate
      expect(appended.status).toBe('CONFIRMED')
      expect(appended.estimatedPrepTimeMinutes).toBe(20)
      expect(eventEmitter.emit).toHaveBeenCalledWith('OrderConfirmed', expect.anything())
    })

    it('throws NotFoundException when the order does not exist', async () => {
      eventStore.load.mockResolvedValueOnce(null)

      await expect(
        service.confirmOrder('missing', { estimatedPrepTimeMinutes: 20 }),
      ).rejects.toThrow(NotFoundException)
      expect(eventStore.append).not.toHaveBeenCalled()
    })
  })

  describe('cancel', () => {
    it('cancels a CREATED order and emits OrderCancelled', async () => {
      eventStore.load.mockResolvedValueOnce(loadedOrder())

      await service.cancel('order-1', {
        reason: 'customer_request',
        cancelledBy: 'customer',
        note: 'changed my mind',
      })

      const appended = eventStore.append.mock.calls[0][0] as OrderAggregate
      expect(appended.status).toBe('CANCELLED')
      expect(eventEmitter.emit).toHaveBeenCalledWith('OrderCancelled', expect.anything())
    })
  })

  // ─── Queries ─────────────────────────────────────────────────────────────────

  describe('findById', () => {
    it('returns the read model when found', async () => {
      const read = { id: 'order-1', customerId: CUSTOMER_ID } as OrderRead
      orderReadRepo.findOne.mockResolvedValueOnce(read)

      await expect(service.findById('order-1')).resolves.toBe(read)
    })

    it('throws NotFoundException when missing', async () => {
      orderReadRepo.findOne.mockResolvedValueOnce(null)
      await expect(service.findById('nope')).rejects.toThrow(NotFoundException)
    })
  })

  describe('findByCustomer', () => {
    it('queries newest-first scoped to the customer', async () => {
      orderReadRepo.find.mockResolvedValueOnce([])
      await service.findByCustomer(CUSTOMER_ID)

      expect(orderReadRepo.find).toHaveBeenCalledWith({
        where: { customerId: CUSTOMER_ID },
        order: { createdAt: 'DESC' },
      })
    })
  })

  describe('findByIdForCustomer (reorder ownership guard)', () => {
    it('returns the order when owned by the customer', async () => {
      const read = { id: 'order-1', customerId: CUSTOMER_ID } as OrderRead
      orderReadRepo.findOne.mockResolvedValueOnce(read)

      await expect(service.findByIdForCustomer('order-1', CUSTOMER_ID)).resolves.toBe(read)
    })

    it('throws NotFoundException when the order belongs to another customer', async () => {
      const read = { id: 'order-1', customerId: OTHER_CUSTOMER } as OrderRead
      orderReadRepo.findOne.mockResolvedValueOnce(read)

      await expect(service.findByIdForCustomer('order-1', CUSTOMER_ID)).rejects.toThrow(
        NotFoundException,
      )
    })
  })
})
