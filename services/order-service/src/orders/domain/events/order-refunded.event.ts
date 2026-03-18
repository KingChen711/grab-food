import { BaseOrderEvent } from './base-order.event'

export class OrderRefundedEvent extends BaseOrderEvent {
  constructor(
    orderId: string,
    public readonly amount: number,
    public readonly reason: string,
  ) {
    super(orderId)
  }
}
