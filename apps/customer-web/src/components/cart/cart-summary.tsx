'use client'

import { Button, formatCurrency } from '@grab/ui'

import type { Cart } from '@/lib/api/cart.api'

interface CartSummaryProps {
  cart: Cart
  onCheckout: () => void
  isCheckingOut?: boolean
}

export function CartSummary({ cart, onCheckout, isCheckingOut }: CartSummaryProps) {
  return (
    <div className="rounded-2xl border bg-card p-5">
      <h2 className="mb-3 text-lg font-semibold">Summary</h2>

      <div className="space-y-2 text-sm">
        <Row label="Subtotal" value={cart.subtotal} />
        <Row
          label="Delivery"
          value={cart.deliveryFee}
          hint={cart.deliveryFee === 0 ? 'set at checkout' : undefined}
        />
        <Row label="Tax (10%)" value={cart.tax} />
        {cart.discount > 0 && <Row label="Discount" value={-cart.discount} highlight />}
        <hr className="my-3" />
        <div className="flex items-center justify-between">
          <span className="font-semibold">Total</span>
          <span className="text-xl font-bold">{formatCurrency(cart.total)}</span>
        </div>
      </div>

      <Button
        className="mt-5 w-full"
        size="lg"
        variant="brand"
        onClick={onCheckout}
        disabled={cart.items.length === 0 || isCheckingOut}
      >
        {isCheckingOut ? 'Processing…' : 'Checkout'}
      </Button>
    </div>
  )
}

function Row({
  label,
  value,
  hint,
  highlight,
}: {
  label: string
  value: number
  hint?: string
  highlight?: boolean
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">
        {label}
        {hint && <span className="ml-2 text-xs">({hint})</span>}
      </span>
      <span className={highlight ? 'font-medium text-emerald-600 dark:text-emerald-400' : ''}>
        {formatCurrency(value)}
      </span>
    </div>
  )
}
