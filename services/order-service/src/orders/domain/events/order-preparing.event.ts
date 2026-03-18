import { BaseOrderEvent } from './base-order.event'

export class OrderPreparingEvent extends BaseOrderEvent {
  constructor(orderId: string) {
    super(orderId)
  }
}
