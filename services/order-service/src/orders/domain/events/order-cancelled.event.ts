import type { CancellationReason } from '@grab/types'

import { BaseOrderEvent } from './base-order.event'

export class OrderCancelledEvent extends BaseOrderEvent {
  constructor(
    orderId: string,
    public readonly reason: CancellationReason,
    public readonly cancelledBy: 'customer' | 'restaurant' | 'system',
    public readonly note?: string,
  ) {
    super(orderId)
  }
}
