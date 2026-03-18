import { BaseOrderEvent } from './base-order.event'

export class OrderPickedUpEvent extends BaseOrderEvent {
  constructor(
    orderId: string,
    public readonly driverId: string,
  ) {
    super(orderId)
  }
}
