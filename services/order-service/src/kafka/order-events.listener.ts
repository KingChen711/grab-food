import { Injectable, Logger } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'

import type { OrderCancelledEvent } from '../orders/domain/events/order-cancelled.event'
import type { OrderCompletedEvent } from '../orders/domain/events/order-completed.event'
import type { OrderConfirmedEvent } from '../orders/domain/events/order-confirmed.event'
import type { OrderCreatedEvent } from '../orders/domain/events/order-created.event'
import type { OrderDeliveredEvent } from '../orders/domain/events/order-delivered.event'
import type { OrderDeliveringEvent } from '../orders/domain/events/order-delivering.event'
import type { OrderPickedUpEvent } from '../orders/domain/events/order-picked-up.event'
import type { OrderPreparingEvent } from '../orders/domain/events/order-preparing.event'
import type { OrderReadyEvent } from '../orders/domain/events/order-ready.event'
import type { OrderRefundedEvent } from '../orders/domain/events/order-refunded.event'
import { KafkaProducerService } from './kafka-producer.service'

const ORDER_EVENTS_TOPIC = 'order.events'

/**
 * Translate in-process domain events (emitted by EventEmitter2 inside
 * order-service) into externally-published Kafka events. Other services
 * (search, analytics, notification) consume `order.events` for projections,
 * KPIs, and customer notifications.
 *
 * The event name on the bus matches the domain class name minus the trailing
 * "Event" — see OrdersService.persistAndEmit().
 */
@Injectable()
export class OrderEventsListener {
  private readonly logger = new Logger(OrderEventsListener.name)

  constructor(private readonly kafka: KafkaProducerService) {}

  @OnEvent('OrderCreated')
  public async onOrderCreated(event: OrderCreatedEvent): Promise<void> {
    await this.publish('order.created', event.orderId, {
      orderId: event.orderId,
      customerId: event.customerId,
      restaurantId: event.restaurantId,
      restaurantName: event.restaurantName,
      itemCount: event.items.length,
      total: event.total,
      occurredOn: event.occurredOn.toISOString(),
    })
  }

  @OnEvent('OrderConfirmed')
  public async onOrderConfirmed(event: OrderConfirmedEvent): Promise<void> {
    await this.publish('order.confirmed', event.orderId, {
      orderId: event.orderId,
      restaurantId: event.restaurantId,
      estimatedPrepTimeMinutes: event.estimatedPrepTimeMinutes,
      occurredOn: event.occurredOn.toISOString(),
    })
  }

  @OnEvent('OrderPreparing')
  public async onOrderPreparing(event: OrderPreparingEvent): Promise<void> {
    await this.publish('order.preparing', event.orderId, {
      orderId: event.orderId,
      occurredOn: event.occurredOn.toISOString(),
    })
  }

  @OnEvent('OrderReady')
  public async onOrderReady(event: OrderReadyEvent): Promise<void> {
    await this.publish('order.ready', event.orderId, {
      orderId: event.orderId,
      occurredOn: event.occurredOn.toISOString(),
    })
  }

  @OnEvent('OrderPickedUp')
  public async onOrderPickedUp(event: OrderPickedUpEvent): Promise<void> {
    await this.publish('order.picked_up', event.orderId, {
      orderId: event.orderId,
      occurredOn: event.occurredOn.toISOString(),
    })
  }

  @OnEvent('OrderDelivering')
  public async onOrderDelivering(event: OrderDeliveringEvent): Promise<void> {
    await this.publish('order.delivering', event.orderId, {
      orderId: event.orderId,
      occurredOn: event.occurredOn.toISOString(),
    })
  }

  @OnEvent('OrderDelivered')
  public async onOrderDelivered(event: OrderDeliveredEvent): Promise<void> {
    await this.publish('order.delivered', event.orderId, {
      orderId: event.orderId,
      occurredOn: event.occurredOn.toISOString(),
    })
  }

  @OnEvent('OrderCompleted')
  public async onOrderCompleted(event: OrderCompletedEvent): Promise<void> {
    await this.publish('order.completed', event.orderId, {
      orderId: event.orderId,
      occurredOn: event.occurredOn.toISOString(),
    })
  }

  @OnEvent('OrderCancelled')
  public async onOrderCancelled(event: OrderCancelledEvent): Promise<void> {
    await this.publish('order.cancelled', event.orderId, {
      orderId: event.orderId,
      occurredOn: event.occurredOn.toISOString(),
    })
  }

  @OnEvent('OrderRefunded')
  public async onOrderRefunded(event: OrderRefundedEvent): Promise<void> {
    await this.publish('order.refunded', event.orderId, {
      orderId: event.orderId,
      occurredOn: event.occurredOn.toISOString(),
    })
  }

  private async publish(type: string, orderId: string, payload: object): Promise<void> {
    try {
      await this.kafka.publish(ORDER_EVENTS_TOPIC, orderId, { type, payload })
      this.logger.debug(`Published ${type} for order ${orderId}`)
    } catch (err) {
      this.logger.error(`Failed to publish ${type} for ${orderId}: ${String(err)}`)
    }
  }
}
