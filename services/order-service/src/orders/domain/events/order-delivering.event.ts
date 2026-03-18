import { BaseOrderEvent } from './base-order.event'

export class OrderDeliveringEvent extends BaseOrderEvent {
  constructor(orderId: string) {
    super(orderId)
  }
}
