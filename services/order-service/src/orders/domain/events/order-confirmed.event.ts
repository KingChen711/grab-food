import { BaseOrderEvent } from './base-order.event'

export class OrderConfirmedEvent extends BaseOrderEvent {
  constructor(
    orderId: string,
    public readonly restaurantId: string,
    public readonly estimatedPrepTimeMinutes: number,
  ) {
    super(orderId)
  }
}
