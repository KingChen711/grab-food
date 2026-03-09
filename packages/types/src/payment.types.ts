import type { Currency, ID, Timestamp } from './common.types'

// ─── Enums ────────────────────────────────────────────────────────────────────

export type PaymentStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'REFUNDED'
  | 'PARTIALLY_REFUNDED'

export type PaymentMethod =
  | 'card'
  | 'wallet'
  | 'cash_on_delivery'
  | 'bank_transfer'
  | 'momo'
  | 'zalopay'

export type PayoutStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'

export type WalletTransactionType = 'credit' | 'debit'

// ─── Payment ──────────────────────────────────────────────────────────────────

export interface Payment {
  id: ID
  orderId: ID
  userId: ID
  amount: number
  currency: Currency
  method: PaymentMethod
  status: PaymentStatus
  stripePaymentIntentId?: string
  idempotencyKey: string
  failureReason?: string
  metadata?: Record<string, unknown>
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface SavedPaymentMethod {
  id: ID
  userId: ID
  type: 'card'
  stripePaymentMethodId: string
  brand: string
  last4: string
  expMonth: number
  expYear: number
  isDefault: boolean
  createdAt: Timestamp
}

// ─── Wallet ───────────────────────────────────────────────────────────────────

export interface Wallet {
  id: ID
  userId: ID
  balance: number
  currency: Currency
  updatedAt: Timestamp
}

export interface WalletTransaction {
  id: ID
  walletId: ID
  type: WalletTransactionType
  amount: number
  balanceBefore: number
  balanceAfter: number
  description: string
  referenceId?: ID
  referenceType?: 'order' | 'topup' | 'refund' | 'payout'
  createdAt: Timestamp
}

// ─── Refund ───────────────────────────────────────────────────────────────────

export interface Refund {
  id: ID
  paymentId: ID
  orderId: ID
  amount: number
  reason: string
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  stripeRefundId?: string
  createdAt: Timestamp
}

// ─── Payout ──────────────────────────────────────────────────────────────────

export interface Payout {
  id: ID
  recipientId: ID
  recipientType: 'restaurant' | 'driver'
  amount: number
  currency: Currency
  status: PayoutStatus
  stripeTransferId?: string
  periodStart: Timestamp
  periodEnd: Timestamp
  createdAt: Timestamp
}

// ─── Invoice ─────────────────────────────────────────────────────────────────

export interface Invoice {
  id: ID
  orderId: ID
  userId: ID
  items: InvoiceItem[]
  subtotal: number
  deliveryFee: number
  tax: number
  discount: number
  total: number
  currency: Currency
  pdfUrl?: string
  issuedAt: Timestamp
}

export interface InvoiceItem {
  name: string
  quantity: number
  unitPrice: number
  totalPrice: number
}
