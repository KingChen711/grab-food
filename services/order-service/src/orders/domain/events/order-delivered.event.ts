import { BaseOrderEvent } from './base-order.event'

export class OrderDeliveredEvent extends BaseOrderEvent {
  constructor(orderId: string) {
    super(orderId)
  }
}
