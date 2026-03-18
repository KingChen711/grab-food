import type { OrderItem } from '@grab/types'

import type { DeliveryAddressVO } from '../value-objects/delivery-address.vo'
import { BaseOrderEvent } from './base-order.event'

export class OrderCreatedEvent extends BaseOrderEvent {
  constructor(
    orderId: string,
    public readonly customerId: string,
    public readonly restaurantId: string,
    public readonly restaurantName: string,
    public readonly items: OrderItem[],
    public readonly subtotal: number,
    public readonly deliveryFee: number,
    public readonly tax: number,
    public readonly total: number,
    public readonly deliveryAddress: DeliveryAddressVO,
    public readonly notes?: string,
    public readonly scheduledFor?: Date,
  ) {
    super(orderId)
  }
}
