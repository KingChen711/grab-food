import type { CancellationReason, OrderItem, OrderStatus } from '@grab/types'
import { BadRequestException } from '@nestjs/common'

import type { BaseOrderEvent } from './events/base-order.event'
import { OrderCancelledEvent } from './events/order-cancelled.event'
import { OrderCompletedEvent } from './events/order-completed.event'
import { OrderConfirmedEvent } from './events/order-confirmed.event'
import { OrderCreatedEvent } from './events/order-created.event'
import { OrderDeliveredEvent } from './events/order-delivered.event'
import { OrderDeliveringEvent } from './events/order-delivering.event'
import { OrderPickedUpEvent } from './events/order-picked-up.event'
import { OrderPreparingEvent } from './events/order-preparing.event'
import { OrderReadyEvent } from './events/order-ready.event'
import { OrderRefundedEvent } from './events/order-refunded.event'
import type { DeliveryAddressVO } from './value-objects/delivery-address.vo'

// States from which cancellation is allowed (before food is picked up)
const CANCELLABLE_STATES: OrderStatus[] = ['CREATED', 'PENDING', 'CONFIRMED', 'PREPARING']

export class OrderAggregate {
  public id!: string
  public customerId!: string
  public restaurantId!: string
  public restaurantName!: string
  public driverId?: string
  public status!: OrderStatus
  public items!: OrderItem[]
  public subtotal!: number
  public deliveryFee!: number
  public tax!: number
  public total!: number
  public deliveryAddress!: DeliveryAddressVO
  public notes?: string
  public estimatedPrepTimeMinutes?: number
  public cancellationReason?: CancellationReason
  public cancellationNote?: string
  public scheduledFor?: Date
  public completedAt?: Date
  public version = 0

  private uncommittedEvents: BaseOrderEvent[] = []

  // ─── Factory ────────────────────────────────────────────────────────────────

  public static create(
    id: string,
    customerId: string,
    restaurantId: string,
    restaurantName: string,
    items: OrderItem[],
    subtotal: number,
    deliveryFee: number,
    tax: number,
    total: number,
    deliveryAddress: DeliveryAddressVO,
    notes?: string,
    scheduledFor?: Date,
  ): OrderAggregate {
    const aggregate = new OrderAggregate()
    aggregate.apply(
      new OrderCreatedEvent(
        id,
        customerId,
        restaurantId,
        restaurantName,
        items,
        subtotal,
        deliveryFee,
        tax,
        total,
        deliveryAddress,
        notes,
        scheduledFor,
      ),
    )
    return aggregate
  }

  public static fromSnapshot(state: Record<string, unknown>): OrderAggregate {
    const aggregate = new OrderAggregate()
    Object.assign(aggregate, state)
    return aggregate
  }

  // ─── State machine transitions ───────────────────────────────────────────────

  public confirm(estimatedPrepTimeMinutes: number): void {
    // PENDING = manual restaurant-accept path (future)
    // CREATED = orchestrated saga path (saga confirms directly after payment)
    if (this.status !== 'PENDING' && this.status !== 'CREATED') {
      throw new BadRequestException(
        `Cannot confirm order: expected status PENDING or CREATED, got ${this.status}`,
      )
    }
    this.apply(new OrderConfirmedEvent(this.id, this.restaurantId, estimatedPrepTimeMinutes))
  }

  public startPreparing(): void {
    this.assertStatus('CONFIRMED', 'startPreparing')
    this.apply(new OrderPreparingEvent(this.id))
  }

  public markReady(): void {
    this.assertStatus('PREPARING', 'markReady')
    this.apply(new OrderReadyEvent(this.id))
  }

  public pickUp(driverId: string): void {
    this.assertStatus('READY', 'pickUp')
    this.apply(new OrderPickedUpEvent(this.id, driverId))
  }

  public startDelivering(): void {
    this.assertStatus('PICKED_UP', 'startDelivering')
    this.apply(new OrderDeliveringEvent(this.id))
  }

  public deliver(): void {
    this.assertStatus('DELIVERING', 'deliver')
    this.apply(new OrderDeliveredEvent(this.id))
  }

  public complete(): void {
    this.assertStatus('DELIVERED', 'complete')
    this.apply(new OrderCompletedEvent(this.id))
  }

  public cancel(
    reason: CancellationReason,
    cancelledBy: 'customer' | 'restaurant' | 'system',
    note?: string,
  ): void {
    if (!CANCELLABLE_STATES.includes(this.status)) {
      throw new BadRequestException(
        `Cannot cancel order in status ${this.status}. Allowed: ${CANCELLABLE_STATES.join(', ')}`,
      )
    }
    this.apply(new OrderCancelledEvent(this.id, reason, cancelledBy, note))
  }

  public refund(amount: number, reason: string): void {
    if (this.status !== 'COMPLETED' && this.status !== 'DELIVERED' && this.status !== 'CANCELLED') {
      throw new BadRequestException(`Cannot refund order in status ${this.status}`)
    }
    this.apply(new OrderRefundedEvent(this.id, amount, reason))
  }

  // ─── Event application ───────────────────────────────────────────────────────

  /** Apply a new event: mutate state AND record for persistence */
  private apply(event: BaseOrderEvent): void {
    this.when(event)
    this.uncommittedEvents.push(event)
    this.version++
  }

  /** Replay historical events: mutate state only, no recording */
  public loadFromHistory(
    events: Array<{ eventType: string; data: Record<string, unknown>; version: number }>,
  ): void {
    for (const stored of events) {
      const event = this.deserialize(stored.eventType, stored.data)
      if (event) {
        this.when(event)
        this.version = stored.version
      }
    }
  }

  private when(event: BaseOrderEvent): void {
    if (event instanceof OrderCreatedEvent) {
      this.id = event.orderId
      this.customerId = event.customerId
      this.restaurantId = event.restaurantId
      this.restaurantName = event.restaurantName
      this.items = event.items
      this.subtotal = event.subtotal
      this.deliveryFee = event.deliveryFee
      this.tax = event.tax
      this.total = event.total
      this.deliveryAddress = event.deliveryAddress
      this.notes = event.notes
      this.scheduledFor = event.scheduledFor
      this.status = 'CREATED'
    } else if (event instanceof OrderConfirmedEvent) {
      this.status = 'CONFIRMED'
      this.estimatedPrepTimeMinutes = event.estimatedPrepTimeMinutes
    } else if (event instanceof OrderPreparingEvent) {
      this.status = 'PREPARING'
    } else if (event instanceof OrderReadyEvent) {
      this.status = 'READY'
    } else if (event instanceof OrderPickedUpEvent) {
      this.status = 'PICKED_UP'
      this.driverId = event.driverId
    } else if (event instanceof OrderDeliveringEvent) {
      this.status = 'DELIVERING'
    } else if (event instanceof OrderDeliveredEvent) {
      this.status = 'DELIVERED'
    } else if (event instanceof OrderCompletedEvent) {
      this.status = 'COMPLETED'
      this.completedAt = event.occurredOn
    } else if (event instanceof OrderCancelledEvent) {
      this.status = 'CANCELLED'
      this.cancellationReason = event.reason
      this.cancellationNote = event.note
    } else if (event instanceof OrderRefundedEvent) {
      this.status = 'REFUNDED'
    }
  }

  // ─── Uncommitted events ──────────────────────────────────────────────────────

  public getUncommittedEvents(): BaseOrderEvent[] {
    return [...this.uncommittedEvents]
  }

  public clearUncommittedEvents(): void {
    this.uncommittedEvents = []
  }

  public toSnapshot(): Record<string, unknown> {
    return {
      id: this.id,
      customerId: this.customerId,
      restaurantId: this.restaurantId,
      restaurantName: this.restaurantName,
      driverId: this.driverId,
      status: this.status,
      items: this.items,
      subtotal: this.subtotal,
      deliveryFee: this.deliveryFee,
      tax: this.tax,
      total: this.total,
      deliveryAddress: this.deliveryAddress,
      notes: this.notes,
      estimatedPrepTimeMinutes: this.estimatedPrepTimeMinutes,
      cancellationReason: this.cancellationReason,
      cancellationNote: this.cancellationNote,
      scheduledFor: this.scheduledFor,
      completedAt: this.completedAt,
      version: this.version,
    }
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private assertStatus(expected: OrderStatus, operation: string): void {
    if (this.status !== expected) {
      throw new BadRequestException(
        `Cannot ${operation} order: expected status ${expected}, got ${this.status}`,
      )
    }
  }

  private deserialize(eventType: string, data: Record<string, unknown>): BaseOrderEvent | null {
    switch (eventType) {
      case 'OrderCreated':
        return Object.assign(
          new OrderCreatedEvent('', '', '', '', [], 0, 0, 0, 0, { address: '', lat: 0, lng: 0 }),
          data,
          { orderId: data['orderId'] as string },
        )
      case 'OrderConfirmed':
        return Object.assign(new OrderConfirmedEvent('', '', 0), data, {
          orderId: data['orderId'] as string,
        })
      case 'OrderPreparing':
        return Object.assign(new OrderPreparingEvent(''), { orderId: data['orderId'] as string })
      case 'OrderReady':
        return Object.assign(new OrderReadyEvent(''), { orderId: data['orderId'] as string })
      case 'OrderPickedUp':
        return Object.assign(new OrderPickedUpEvent('', ''), data, {
          orderId: data['orderId'] as string,
        })
      case 'OrderDelivering':
        return Object.assign(new OrderDeliveringEvent(''), { orderId: data['orderId'] as string })
      case 'OrderDelivered':
        return Object.assign(new OrderDeliveredEvent(''), { orderId: data['orderId'] as string })
      case 'OrderCompleted':
        return Object.assign(new OrderCompletedEvent(''), { orderId: data['orderId'] as string })
      case 'OrderCancelled':
        return Object.assign(new OrderCancelledEvent('', 'customer_request', 'system'), data, {
          orderId: data['orderId'] as string,
        })
      case 'OrderRefunded':
        return Object.assign(new OrderRefundedEvent('', 0, ''), data, {
          orderId: data['orderId'] as string,
        })
      default:
        return null
    }
  }
}
