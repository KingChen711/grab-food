'use client'

import { Button, formatCurrency, Skeleton } from '@grab/ui'
import { ArrowLeft, CreditCard } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { AddressPicker } from '@/components/checkout/address-picker'
import { useAddresses } from '@/hooks/use-addresses-query'
import { useCart, useCheckout } from '@/hooks/use-cart-query'

// Phase 4 will replace this with real payment method selection
const PAYMENT_METHODS = [
  { id: 'cod', label: 'Cash on delivery', description: 'Pay when your order arrives' },
] as const

export function CheckoutPageClient() {
  const router = useRouter()
  const { data: cart, isLoading: cartLoading } = useCart()
  const { data: addresses, isLoading: addrLoading } = useAddresses()
  const checkout = useCheckout()

  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<string>('cod')
  const [notes, setNotes] = useState('')

  // Auto-select default address once loaded
  useEffect(() => {
    if (selectedAddressId || !addresses?.length) return
    const defaultAddr = addresses.find((a) => a.isDefault) ?? addresses[0]
    setSelectedAddressId(defaultAddr.id)
  }, [addresses, selectedAddressId])

  const selectedAddress = useMemo(
    () => addresses?.find((a) => a.id === selectedAddressId),
    [addresses, selectedAddressId],
  )

  // Empty cart → redirect back
  useEffect(() => {
    if (!cartLoading && (!cart || cart.items.length === 0)) {
      router.replace('/cart')
    }
  }, [cart, cartLoading, router])

  if (cartLoading || addrLoading || !cart) return <CheckoutSkeleton />

  function handlePlaceOrder() {
    if (!selectedAddress) {
      toast.error('Please select a delivery address')
      return
    }
    if (!selectedAddress.lat || !selectedAddress.lng) {
      toast.error('Selected address is missing coordinates. Please re-save it.')
      return
    }

    checkout.mutate(
      {
        deliveryAddress: {
          label: selectedAddress.label,
          address: selectedAddress.fullAddress,
          lat: selectedAddress.lat,
          lng: selectedAddress.lng,
        },
        notes: notes || undefined,
      },
      {
        onSuccess: ({ orderId }) => {
          toast.success('Order placed!')
          router.push(`/orders/${orderId}`)
        },
        onError: () => toast.error('Failed to place order — please try again'),
      },
    )
  }

  return (
    <div className="container max-w-5xl py-8">
      <div className="mb-6">
        <Link
          href="/cart"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to cart
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Checkout</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="space-y-6 md:col-span-2">
          <Section title="Delivery address">
            <AddressPicker
              addresses={addresses ?? []}
              selectedId={selectedAddressId}
              onSelect={setSelectedAddressId}
            />
          </Section>

          <Section title="Payment">
            <div className="space-y-2">
              {PAYMENT_METHODS.map((m) => (
                <label
                  key={m.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors hover:border-brand ${
                    paymentMethod === m.id ? 'border-brand bg-brand/5' : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    value={m.id}
                    checked={paymentMethod === m.id}
                    onChange={() => setPaymentMethod(m.id)}
                    className="mt-1 accent-brand"
                  />
                  <CreditCard className="mt-0.5 h-5 w-5 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="font-medium">{m.label}</p>
                    <p className="text-xs text-muted-foreground">{m.description}</p>
                  </div>
                </label>
              ))}
              <p className="text-xs text-muted-foreground">
                Card and wallet payments arrive in Phase 4 (Stripe integration).
              </p>
            </div>
          </Section>

          <Section title="Order notes">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="E.g. leave at the door, call when arriving..."
              rows={3}
              className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </Section>

          <Section title="Items">
            <ul className="divide-y text-sm">
              {cart.items.map((item) => (
                <li key={item.cartItemId} className="flex justify-between gap-3 py-2">
                  <span className="flex-1">
                    <span className="font-medium">{item.quantity}×</span> {item.menuItemName}
                    {item.selectedVariant && (
                      <span className="text-muted-foreground"> ({item.selectedVariant.name})</span>
                    )}
                  </span>
                  <span className="whitespace-nowrap">{formatCurrency(item.totalPrice)}</span>
                </li>
              ))}
            </ul>
          </Section>
        </div>

        {/* Sticky summary */}
        <div className="md:col-span-1">
          <div className="sticky top-20 rounded-2xl border bg-card p-5">
            <h2 className="mb-3 text-lg font-semibold">Total</h2>
            <SummaryRow label="Subtotal" value={cart.subtotal} />
            <SummaryRow label="Delivery" value={cart.deliveryFee} />
            <SummaryRow label="Tax" value={cart.tax} />
            {cart.discount > 0 && <SummaryRow label="Discount" value={-cart.discount} highlight />}
            <hr className="my-3" />
            <div className="flex items-center justify-between text-lg font-bold">
              <span>Pay</span>
              <span>{formatCurrency(cart.total)}</span>
            </div>
            <Button
              size="lg"
              variant="brand"
              className="mt-5 w-full"
              onClick={handlePlaceOrder}
              disabled={!selectedAddress || checkout.isPending}
            >
              {checkout.isPending ? 'Placing order…' : 'Place order'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border bg-card p-5">
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  )
}

function SummaryRow({
  label,
  value,
  highlight,
}: {
  label: string
  value: number
  highlight?: boolean
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={highlight ? 'text-emerald-600 dark:text-emerald-400' : ''}>
        {formatCurrency(value)}
      </span>
    </div>
  )
}

function CheckoutSkeleton() {
  return (
    <div className="container max-w-5xl py-8">
      <Skeleton className="mb-6 h-8 w-32" />
      <div className="grid gap-6 md:grid-cols-3">
        <div className="space-y-4 md:col-span-2">
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    </div>
  )
}
