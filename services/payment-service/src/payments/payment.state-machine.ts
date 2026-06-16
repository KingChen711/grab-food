import type { PaymentStatus } from '@grab/types'
import { BadRequestException } from '@nestjs/common'

/**
 * Allowed forward transitions for a payment's lifecycle. A payment may only
 * move along an edge declared here — anything else is a programming error or a
 * stale/duplicate event and must be rejected.
 *
 *   PENDING ─┬─▶ PROCESSING ─┬─▶ SUCCEEDED ─┬─▶ REFUNDED
 *            │               └─▶ FAILED      └─▶ PARTIALLY_REFUNDED ─▶ REFUNDED
 *            ├─▶ SUCCEEDED   (wallet: settles synchronously)
 *            └─▶ FAILED
 */
export const PAYMENT_TRANSITIONS: Record<PaymentStatus, readonly PaymentStatus[]> = {
  PENDING: ['PROCESSING', 'SUCCEEDED', 'FAILED'],
  PROCESSING: ['SUCCEEDED', 'FAILED'],
  SUCCEEDED: ['REFUNDED', 'PARTIALLY_REFUNDED'],
  PARTIALLY_REFUNDED: ['PARTIALLY_REFUNDED', 'REFUNDED'],
  FAILED: [],
  REFUNDED: [],
}

export function canTransition(from: PaymentStatus, to: PaymentStatus): boolean {
  return PAYMENT_TRANSITIONS[from].includes(to)
}

export function assertCanTransition(from: PaymentStatus, to: PaymentStatus): void {
  if (!canTransition(from, to)) {
    throw new BadRequestException(`Invalid payment transition: ${from} → ${to}`)
  }
}
