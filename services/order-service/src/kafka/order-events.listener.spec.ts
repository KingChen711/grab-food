import { Test } from '@nestjs/testing'

import { OrderConfirmedEvent } from '../orders/domain/events/order-confirmed.event'
import { OrderCreatedEvent } from '../orders/domain/events/order-created.event'
import { KafkaProducerService } from './kafka-producer.service'
import { OrderEventsListener } from './order-events.listener'

describe('OrderEventsListener', () => {
  let listener: OrderEventsListener
  let kafka: jest.Mocked<KafkaProducerService>

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        OrderEventsListener,
        {
          provide: KafkaProducerService,
          useValue: { publish: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile()

    listener = module.get(OrderEventsListener)
    kafka = module.get(KafkaProducerService)
  })

  it('publishes order.created with order ID as key', async () => {
    const event = new OrderCreatedEvent(
      'order-1',
      'customer-1',
      'restaurant-1',
      'Pizza Palace',
      [
        {
          id: 'oi-1',
          orderId: 'order-1',
          menuItemId: 'item-1',
          menuItemName: 'Pizza',
          unitPrice: 10,
          quantity: 2,
          totalPrice: 20,
          addonNames: [],
        },
      ],
      20,
      5,
      2,
      27,
      { address: '123 St', lat: 0, lng: 0 } as never,
    )

    await listener.onOrderCreated(event)

    expect(kafka.publish).toHaveBeenCalledWith(
      'order.events',
      'order-1',
      expect.objectContaining({
        type: 'order.created',
        payload: expect.objectContaining({ orderId: 'order-1', total: 27, itemCount: 1 }),
      }),
    )
  })

  it('publishes order.confirmed', async () => {
    const event = new OrderConfirmedEvent('order-1', 'restaurant-1', 25)

    await listener.onOrderConfirmed(event)

    expect(kafka.publish).toHaveBeenCalledWith(
      'order.events',
      'order-1',
      expect.objectContaining({
        type: 'order.confirmed',
        payload: expect.objectContaining({ estimatedPrepTimeMinutes: 25 }),
      }),
    )
  })
})
