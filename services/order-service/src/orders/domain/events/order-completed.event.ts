import { BaseOrderEvent } from './base-order.event'

export class OrderCompletedEvent extends BaseOrderEvent {
  constructor(orderId: string) {
    super(orderId)
  }
}
