import type { OrderItem } from '@grab/types'

import { OrderAggregate } from './order.aggregate'
import type { DeliveryAddressVO } from './value-objects/delivery-address.vo'

const address: DeliveryAddressVO = { address: '123 Main St', lat: 1.3, lng: 103.8 }

const items: OrderItem[] = [
  {
    id: 'item-1',
    orderId: 'order-1',
    menuItemId: 'menu-1',
    menuItemName: 'Burger',
    quantity: 2,
    addonNames: [],
    unitPrice: 10,
    totalPrice: 20,
  },
]

function makeOrder(): OrderAggregate {
  return OrderAggregate.create(
    'order-1',
    'customer-1',
    'restaurant-1',
    'Test Restaurant',
    items,
    20,
    3,
    2,
    25,
    address,
  )
}

describe('OrderAggregate', () => {
  describe('create', () => {
    it('should create an order in CREATED status', () => {
      const order = makeOrder()
      expect(order.status).toBe('CREATED')
      expect(order.id).toBe('order-1')
      expect(order.version).toBe(1)
    })

    it('should have one uncommitted event after create', () => {
      const order = makeOrder()
      expect(order.getUncommittedEvents()).toHaveLength(1)
      expect(order.getUncommittedEvents()[0].constructor.name).toBe('OrderCreatedEvent')
    })
  })

  describe('state machine', () => {
    it('confirm: PENDING → CONFIRMED', () => {
      const order = makeOrder()
      // Manually set status to PENDING to test confirm
      ;(order as unknown as { status: string }).status = 'PENDING'
      order.confirm(15)
      expect(order.status).toBe('CONFIRMED')
      expect(order.estimatedPrepTimeMinutes).toBe(15)
    })

    it('startPreparing: CONFIRMED → PREPARING', () => {
      const order = makeOrder()
      ;(order as unknown as { status: string }).status = 'CONFIRMED'
      order.startPreparing()
      expect(order.status).toBe('PREPARING')
    })

    it('markReady: PREPARING → READY', () => {
      const order = makeOrder()
      ;(order as unknown as { status: string }).status = 'PREPARING'
      order.markReady()
      expect(order.status).toBe('READY')
    })

    it('pickUp: READY → PICKED_UP', () => {
      const order = makeOrder()
      ;(order as unknown as { status: string }).status = 'READY'
      order.pickUp('driver-1')
      expect(order.status).toBe('PICKED_UP')
      expect(order.driverId).toBe('driver-1')
    })

    it('startDelivering: PICKED_UP → DELIVERING', () => {
      const order = makeOrder()
      ;(order as unknown as { status: string }).status = 'PICKED_UP'
      order.startDelivering()
      expect(order.status).toBe('DELIVERING')
    })

    it('deliver: DELIVERING → DELIVERED', () => {
      const order = makeOrder()
      ;(order as unknown as { status: string }).status = 'DELIVERING'
      order.deliver()
      expect(order.status).toBe('DELIVERED')
    })

    it('complete: DELIVERED → COMPLETED', () => {
      const order = makeOrder()
      ;(order as unknown as { status: string }).status = 'DELIVERED'
      order.complete()
      expect(order.status).toBe('COMPLETED')
      expect(order.completedAt).toBeInstanceOf(Date)
    })
  })

  describe('cancel', () => {
    it('should cancel from CREATED', () => {
      const order = makeOrder()
      order.cancel('customer_request', 'customer', 'Changed my mind')
      expect(order.status).toBe('CANCELLED')
      expect(order.cancellationReason).toBe('customer_request')
      expect(order.cancellationNote).toBe('Changed my mind')
    })

    it('should throw when cancelling from PICKED_UP', () => {
      const order = makeOrder()
      ;(order as unknown as { status: string }).status = 'PICKED_UP'
      expect(() => order.cancel('customer_request', 'customer')).toThrow()
    })
  })

  describe('refund', () => {
    it('should refund a COMPLETED order', () => {
      const order = makeOrder()
      ;(order as unknown as { status: string }).status = 'COMPLETED'
      order.refund(25, 'Item not delivered')
      expect(order.status).toBe('REFUNDED')
    })

    it('should throw when refunding a PREPARING order', () => {
      const order = makeOrder()
      ;(order as unknown as { status: string }).status = 'PREPARING'
      expect(() => order.refund(10, 'bad')).toThrow()
    })
  })

  describe('loadFromHistory', () => {
    it('should rebuild state from events', () => {
      const original = makeOrder()
      ;(original as unknown as { status: string }).status = 'PENDING'
      original.confirm(20)
      original.startPreparing()

      const snapshot = original.toSnapshot()
      const uncommitted = original.getUncommittedEvents()

      // Simulate storing events
      const storedEvents = uncommitted.map((e, i) => ({
        eventType: e.constructor.name.replace('Event', ''),
        data: { ...e } as Record<string, unknown>,
        version: i + 1,
      }))

      // Rebuild from scratch via history
      const rebuilt = new OrderAggregate()
      rebuilt.loadFromHistory(storedEvents)

      expect(snapshot).toBeDefined()
      expect(rebuilt.status).toBe('PREPARING')
    })
  })

  describe('snapshot', () => {
    it('should produce a snapshot with all fields', () => {
      const order = makeOrder()
      const snapshot = order.toSnapshot()
      expect(snapshot.id).toBe('order-1')
      expect(snapshot.status).toBe('CREATED')
      expect(snapshot.version).toBe(1)
    })

    it('fromSnapshot should restore aggregate', () => {
      const order = makeOrder()
      const snapshot = order.toSnapshot()
      const restored = OrderAggregate.fromSnapshot(snapshot)
      expect(restored.id).toBe(order.id)
      expect(restored.status).toBe(order.status)
      expect(restored.version).toBe(order.version)
    })
  })

  describe('clearUncommittedEvents', () => {
    it('should clear after calling clearUncommittedEvents', () => {
      const order = makeOrder()
      expect(order.getUncommittedEvents()).toHaveLength(1)
      order.clearUncommittedEvents()
      expect(order.getUncommittedEvents()).toHaveLength(0)
    })
  })
})
