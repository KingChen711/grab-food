import { Injectable, Logger } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'
import { InjectRepository } from '@nestjs/typeorm'
import type { Repository } from 'typeorm'

import type { OrderCancelledEvent } from '../domain/events/order-cancelled.event'
import type { OrderCompletedEvent } from '../domain/events/order-completed.event'
import type { OrderConfirmedEvent } from '../domain/events/order-confirmed.event'
import type { OrderCreatedEvent } from '../domain/events/order-created.event'
import type { OrderDeliveredEvent } from '../domain/events/order-delivered.event'
import type { OrderDeliveringEvent } from '../domain/events/order-delivering.event'
import type { OrderPickedUpEvent } from '../domain/events/order-picked-up.event'
import type { OrderPreparingEvent } from '../domain/events/order-preparing.event'
import type { OrderReadyEvent } from '../domain/events/order-ready.event'
import type { OrderRefundedEvent } from '../domain/events/order-refunded.event'
import { OrderItemRead } from './entities/order-item-read.entity'
import { OrderRead } from './entities/order-read.entity'
import { OrderTimeline } from './entities/order-timeline.entity'

@Injectable()
export class OrderReadProjection {
  private readonly logger = new Logger(OrderReadProjection.name)

  constructor(
    @InjectRepository(OrderRead) private readonly orderRepo: Repository<OrderRead>,
    @InjectRepository(OrderItemRead) private readonly itemRepo: Repository<OrderItemRead>,
    @InjectRepository(OrderTimeline) private readonly timelineRepo: Repository<OrderTimeline>,
  ) {}

  @OnEvent('OrderCreated')
  public async onOrderCreated(event: OrderCreatedEvent): Promise<void> {
    const order = this.orderRepo.create({
      id: event.orderId,
      customerId: event.customerId,
      restaurantId: event.restaurantId,
      restaurantName: event.restaurantName,
      status: 'CREATED',
      subtotal: event.subtotal,
      deliveryFee: event.deliveryFee,
      tax: event.tax,
      total: event.total,
      deliveryAddress: event.deliveryAddress as unknown as Record<string, unknown>,
      notes: event.notes,
      scheduledFor: event.scheduledFor,
      version: 1,
      createdAt: event.occurredOn,
    })
    await this.orderRepo.save(order)

    const items = event.items.map((item) =>
      this.itemRepo.create({
        menuItemId: item.menuItemId,
        menuItemName: item.menuItemName,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        notes: item.notes,
        order,
      }),
    )
    await this.itemRepo.save(items)

    await this.addTimeline(event.orderId, 'CREATED', event.occurredOn)
    this.logger.debug(`Projected OrderCreated: ${event.orderId}`)
  }

  @OnEvent('OrderConfirmed')
  public async onOrderConfirmed(event: OrderConfirmedEvent): Promise<void> {
    await this.orderRepo.update(event.orderId, {
      status: 'CONFIRMED',
      estimatedPrepTimeMinutes: event.estimatedPrepTimeMinutes,
    })
    await this.addTimeline(event.orderId, 'CONFIRMED', event.occurredOn)
  }

  @OnEvent('OrderPreparing')
  public async onOrderPreparing(event: OrderPreparingEvent): Promise<void> {
    await this.orderRepo.update(event.orderId, { status: 'PREPARING' })
    await this.addTimeline(event.orderId, 'PREPARING', event.occurredOn)
  }

  @OnEvent('OrderReady')
  public async onOrderReady(event: OrderReadyEvent): Promise<void> {
    await this.orderRepo.update(event.orderId, { status: 'READY' })
    await this.addTimeline(event.orderId, 'READY', event.occurredOn)
  }

  @OnEvent('OrderPickedUp')
  public async onOrderPickedUp(event: OrderPickedUpEvent): Promise<void> {
    await this.orderRepo.update(event.orderId, { status: 'PICKED_UP', driverId: event.driverId })
    await this.addTimeline(event.orderId, 'PICKED_UP', event.occurredOn)
  }

  @OnEvent('OrderDelivering')
  public async onOrderDelivering(event: OrderDeliveringEvent): Promise<void> {
    await this.orderRepo.update(event.orderId, { status: 'DELIVERING' })
    await this.addTimeline(event.orderId, 'DELIVERING', event.occurredOn)
  }

  @OnEvent('OrderDelivered')
  public async onOrderDelivered(event: OrderDeliveredEvent): Promise<void> {
    await this.orderRepo.update(event.orderId, { status: 'DELIVERED' })
    await this.addTimeline(event.orderId, 'DELIVERED', event.occurredOn)
  }

  @OnEvent('OrderCompleted')
  public async onOrderCompleted(event: OrderCompletedEvent): Promise<void> {
    await this.orderRepo.update(event.orderId, {
      status: 'COMPLETED',
      completedAt: event.occurredOn,
    })
    await this.addTimeline(event.orderId, 'COMPLETED', event.occurredOn)
  }

  @OnEvent('OrderCancelled')
  public async onOrderCancelled(event: OrderCancelledEvent): Promise<void> {
    await this.orderRepo.update(event.orderId, {
      status: 'CANCELLED',
      cancellationReason: event.reason,
      cancellationNote: event.note,
    })
    await this.addTimeline(event.orderId, 'CANCELLED', event.occurredOn, event.note)
  }

  @OnEvent('OrderRefunded')
  public async onOrderRefunded(event: OrderRefundedEvent): Promise<void> {
    await this.orderRepo.update(event.orderId, { status: 'REFUNDED' })
    await this.addTimeline(event.orderId, 'REFUNDED', event.occurredOn, event.reason)
  }

  private async addTimeline(
    orderId: string,
    status: OrderRead['status'],
    occurredOn: Date,
    note?: string,
  ): Promise<void> {
    await this.timelineRepo.save(this.timelineRepo.create({ orderId, status, occurredOn, note }))
  }
}
