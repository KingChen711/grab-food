import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'

import type { OrderCancelledEvent } from '../domain/events/order-cancelled.event'
import type { OrderCompletedEvent } from '../domain/events/order-completed.event'
import type { OrderConfirmedEvent } from '../domain/events/order-confirmed.event'
import type { OrderCreatedEvent } from '../domain/events/order-created.event'
import type { OrderPickedUpEvent } from '../domain/events/order-picked-up.event'
import { OrderItemRead } from './entities/order-item-read.entity'
import { OrderRead } from './entities/order-read.entity'
import { OrderTimeline } from './entities/order-timeline.entity'
import { OrderReadProjection } from './order-read.projection'

const makeRepo = () => ({
  create: jest.fn((x: unknown) => x),
  save: jest.fn((x: unknown) => Promise.resolve(x)),
  update: jest.fn().mockResolvedValue(undefined),
})

const OCCURRED_ON = new Date('2026-06-15T10:00:00Z')

describe('OrderReadProjection', () => {
  let projection: OrderReadProjection
  let orderRepo: ReturnType<typeof makeRepo>
  let itemRepo: ReturnType<typeof makeRepo>
  let timelineRepo: ReturnType<typeof makeRepo>

  beforeEach(async () => {
    orderRepo = makeRepo()
    itemRepo = makeRepo()
    timelineRepo = makeRepo()

    const module = await Test.createTestingModule({
      providers: [
        OrderReadProjection,
        { provide: getRepositoryToken(OrderRead), useValue: orderRepo },
        { provide: getRepositoryToken(OrderItemRead), useValue: itemRepo },
        { provide: getRepositoryToken(OrderTimeline), useValue: timelineRepo },
      ],
    }).compile()

    projection = module.get(OrderReadProjection)
  })

  afterEach(() => jest.clearAllMocks())

  it('onOrderCreated inserts the order, its items and a CREATED timeline entry', async () => {
    const event = {
      orderId: 'order-1',
      customerId: 'cust-1',
      restaurantId: 'rest-1',
      restaurantName: 'Pizza Palace',
      subtotal: 200_000,
      deliveryFee: 15_000,
      tax: 5_000,
      total: 220_000,
      deliveryAddress: { address: '1 Le Loi', lat: 10.77, lng: 106.7 },
      items: [{ menuItemId: 'm-1', menuItemName: 'Margherita', unitPrice: 100_000, quantity: 2 }],
      occurredOn: OCCURRED_ON,
    } as unknown as OrderCreatedEvent

    await projection.onOrderCreated(event)

    expect(orderRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'order-1', status: 'CREATED', total: 220_000, version: 1 }),
    )
    expect(orderRepo.save).toHaveBeenCalledTimes(1)
    expect(itemRepo.create).toHaveBeenCalledTimes(1)
    expect(itemRepo.save).toHaveBeenCalledTimes(1)
    expect(timelineRepo.save).toHaveBeenCalledTimes(1)
  })

  it('onOrderConfirmed updates status and prep time, and appends a timeline entry', async () => {
    const event = {
      orderId: 'order-1',
      estimatedPrepTimeMinutes: 20,
      occurredOn: OCCURRED_ON,
    } as unknown as OrderConfirmedEvent

    await projection.onOrderConfirmed(event)

    expect(orderRepo.update).toHaveBeenCalledWith('order-1', {
      status: 'CONFIRMED',
      estimatedPrepTimeMinutes: 20,
    })
    expect(timelineRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ orderId: 'order-1', status: 'CONFIRMED' }),
    )
  })

  it('onOrderPickedUp records the assigned driver', async () => {
    const event = {
      orderId: 'order-1',
      driverId: 'driver-9',
      occurredOn: OCCURRED_ON,
    } as unknown as OrderPickedUpEvent

    await projection.onOrderPickedUp(event)

    expect(orderRepo.update).toHaveBeenCalledWith('order-1', {
      status: 'PICKED_UP',
      driverId: 'driver-9',
    })
  })

  it('onOrderCompleted stamps completedAt', async () => {
    const event = { orderId: 'order-1', occurredOn: OCCURRED_ON } as unknown as OrderCompletedEvent

    await projection.onOrderCompleted(event)

    expect(orderRepo.update).toHaveBeenCalledWith('order-1', {
      status: 'COMPLETED',
      completedAt: OCCURRED_ON,
    })
  })

  it('onOrderCancelled stores the reason/note and surfaces the note on the timeline', async () => {
    const event = {
      orderId: 'order-1',
      reason: 'customer_request',
      note: 'changed my mind',
      occurredOn: OCCURRED_ON,
    } as unknown as OrderCancelledEvent

    await projection.onOrderCancelled(event)

    expect(orderRepo.update).toHaveBeenCalledWith('order-1', {
      status: 'CANCELLED',
      cancellationReason: 'customer_request',
      cancellationNote: 'changed my mind',
    })
    expect(timelineRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'CANCELLED', note: 'changed my mind' }),
    )
  })
})
