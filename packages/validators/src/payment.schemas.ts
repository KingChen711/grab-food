import { z } from 'zod'

import { idSchema } from './common.schemas'

// ─── Payment ──────────────────────────────────────────────────────────────────

export const processPaymentSchema = z.object({
  orderId: idSchema,
  amount: z.number().int().min(1000, 'Minimum payment is 1,000 VND'),
  currency: z.enum(['VND', 'USD']).default('VND'),
  method: z.enum(['card', 'wallet', 'cash_on_delivery', 'momo', 'zalopay']),
  paymentMethodId: idSchema.optional(),
  idempotencyKey: z.string().min(10).max(100),
})

export const addPaymentMethodSchema = z.object({
  stripePaymentMethodId: z.string().min(1, 'Stripe payment method ID is required'),
  setAsDefault: z.boolean().default(false),
})

// ─── Wallet ───────────────────────────────────────────────────────────────────

export const topUpWalletSchema = z.object({
  amount: z
    .number()
    .int()
    .min(10_000, 'Minimum top-up is 10,000 VND')
    .max(50_000_000, 'Maximum top-up is 50,000,000 VND'),
  paymentMethodId: idSchema,
})

export const walletTransactionQuerySchema = z.object({
  type: z.enum(['credit', 'debit']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
})

// ─── Refund ───────────────────────────────────────────────────────────────────

export const requestRefundSchema = z.object({
  orderId: idSchema,
  amount: z.number().int().min(0).optional(),
  reason: z.string().min(10, 'Please provide a detailed reason').max(500),
})

// ─── Type Exports ─────────────────────────────────────────────────────────────

export type ProcessPaymentInput = z.infer<typeof processPaymentSchema>
export type AddPaymentMethodInput = z.infer<typeof addPaymentMethodSchema>
export type TopUpWalletInput = z.infer<typeof topUpWalletSchema>
export type WalletTransactionQuery = z.infer<typeof walletTransactionQuerySchema>
export type RequestRefundInput = z.infer<typeof requestRefundSchema>
