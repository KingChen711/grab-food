import { BaseOrderEvent } from './base-order.event'

export class OrderReadyEvent extends BaseOrderEvent {
  constructor(orderId: string) {
    super(orderId)
  }
}
