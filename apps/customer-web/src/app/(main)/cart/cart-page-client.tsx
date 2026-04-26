'use client'

import { Button, EmptyState, Skeleton } from '@grab/ui'
import { ShoppingBag } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { CartItemRow } from '@/components/cart/cart-item-row'
import { CartSummary } from '@/components/cart/cart-summary'
import { PromoCodeInput } from '@/components/cart/promo-code-input'
import {
  useApplyPromo,
  useCart,
  useClearCart,
  useRemoveFromCart,
  useRemovePromo,
  useUpdateCartQuantity,
} from '@/hooks/use-cart-query'

export function CartPageClient() {
  const router = useRouter()
  const { data: cart, isLoading } = useCart()

  const updateQuantity = useUpdateCartQuantity()
  const removeItem = useRemoveFromCart()
  const clear = useClearCart()
  const applyPromo = useApplyPromo()
  const removePromo = useRemovePromo()

  const isMutating =
    updateQuantity.isPending ||
    removeItem.isPending ||
    clear.isPending ||
    applyPromo.isPending ||
    removePromo.isPending

  if (isLoading) {
    return <CartSkeleton />
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="container max-w-2xl py-12">
        <EmptyState
          icon={<ShoppingBag className="h-12 w-12" />}
          title="Your cart is empty"
          description="Browse restaurants to find something delicious."
          action={{ label: 'Find restaurants', onClick: () => router.push('/search') }}
        />
      </div>
    )
  }

  return (
    <div className="container max-w-5xl py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Your cart</h1>
          <Link
            href={`/restaurant/${cart.restaurantId}`}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            from {cart.restaurantName}
          </Link>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (window.confirm('Clear all items from cart?')) {
              clear.mutate(undefined, {
                onSuccess: () => toast.success('Cart cleared'),
              })
            }
          }}
          disabled={isMutating}
        >
          Clear cart
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Items + promo */}
        <div className="md:col-span-2">
          <div className="rounded-2xl border bg-card p-2 sm:p-4">
            {cart.items.map((item) => (
              <CartItemRow
                key={item.cartItemId}
                item={item}
                onQuantityChange={(id, qty) =>
                  updateQuantity.mutate({ cartItemId: id, quantity: qty })
                }
                onRemove={(id) => removeItem.mutate(id)}
                disabled={isMutating}
              />
            ))}
          </div>

          <div className="mt-4">
            <PromoCodeInput
              appliedCode={cart.appliedPromotionCode}
              onApply={(code) =>
                applyPromo.mutate(code, {
                  onSuccess: () => toast.success(`Code "${code}" applied`),
                  onError: () => toast.error('Invalid promo code'),
                })
              }
              onRemove={() => removePromo.mutate()}
              isApplying={applyPromo.isPending}
            />
          </div>
        </div>

        {/* Summary */}
        <CartSummary cart={cart} onCheckout={() => router.push('/checkout')} />
      </div>
    </div>
  )
}

function CartSkeleton() {
  return (
    <div className="container max-w-5xl py-8">
      <Skeleton className="mb-6 h-8 w-48" />
      <div className="grid gap-6 md:grid-cols-3">
        <div className="space-y-4 md:col-span-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex gap-4 rounded-2xl border p-4">
              <Skeleton className="h-20 w-20 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-4 w-1/4" />
              </div>
            </div>
          ))}
        </div>
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    </div>
  )
}
