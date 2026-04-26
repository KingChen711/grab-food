'use client'

import { Button, formatCurrency, OrderStatusBadge, Skeleton } from '@grab/ui'
import { ArrowLeft, MapPin, RotateCcw, X } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { OrderTimeline } from '@/components/orders/order-timeline'
import { useReorder } from '@/hooks/use-cart-query'
import { useCancelOrder, useOrder } from '@/hooks/use-orders-query'

const CANCELLABLE: string[] = ['CREATED', 'PENDING', 'CONFIRMED', 'PREPARING']

interface OrderDetailClientProps {
  id: string
}

export function OrderDetailClient({ id }: OrderDetailClientProps) {
  const router = useRouter()
  const { data: order, isLoading, isError } = useOrder(id)
  const cancel = useCancelOrder()
  const reorder = useReorder()

  if (isLoading) return <OrderDetailSkeleton />
  if (isError || !order) {
    return (
      <div className="container max-w-3xl py-8">
        <p className="text-sm text-muted-foreground">Order not found.</p>
        <Button asChild variant="ghost" size="sm" className="mt-4">
          <Link href="/orders">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to orders
          </Link>
        </Button>
      </div>
    )
  }

  const canCancel = CANCELLABLE.includes(order.status)
  const isCompleted = order.status === 'DELIVERED' || order.status === 'COMPLETED'

  function handleCancel() {
    if (!window.confirm('Are you sure you want to cancel this order?')) return
    cancel.mutate(
      { id, reason: 'CUSTOMER_REQUEST' },
      {
        onSuccess: () => toast.success('Order cancelled'),
        onError: () => toast.error('Failed to cancel order'),
      },
    )
  }

  function handleReorder() {
    reorder.mutate(id, {
      onSuccess: () => {
        toast.success('Items added to cart')
        router.push('/cart')
      },
      onError: () => toast.error('Failed to reorder'),
    })
  }

  return (
    <div className="container max-w-3xl py-8">
      <Link
        href="/orders"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to orders
      </Link>

      <div className="mt-3 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{order.restaurantName}</h1>
          <p className="text-sm text-muted-foreground">
            Order #{order.id.slice(0, 8)} · {new Date(order.createdAt).toLocaleString('en-GB')}
          </p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      <div className="mt-6 space-y-5">
        <Section title="Status">
          <OrderTimeline current={order.status} events={order.timeline} />
        </Section>

        <Section title="Delivery to">
          <div className="flex items-start gap-2 text-sm">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div>
              {order.deliveryAddress.label && (
                <p className="font-medium">{order.deliveryAddress.label}</p>
              )}
              <p className="text-muted-foreground">{order.deliveryAddress.address}</p>
              {order.deliveryAddress.notes && (
                <p className="mt-1 text-xs italic text-muted-foreground">
                  Note: {order.deliveryAddress.notes}
                </p>
              )}
            </div>
          </div>
        </Section>

        <Section title="Items">
          <ul className="divide-y text-sm">
            {order.items.map((item) => (
              <li key={item.id} className="flex justify-between gap-3 py-2">
                <span className="flex-1">
                  <span className="font-medium">{item.quantity}×</span> {item.menuItemName}
                  {item.notes && (
                    <span className="block text-xs italic text-muted-foreground">{item.notes}</span>
                  )}
                </span>
                <span className="whitespace-nowrap">
                  {formatCurrency(Number(item.unitPrice) * item.quantity)}
                </span>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Total">
          <div className="space-y-1 text-sm">
            <SummaryRow label="Subtotal" value={Number(order.subtotal)} />
            <SummaryRow label="Delivery" value={Number(order.deliveryFee)} />
            <SummaryRow label="Tax" value={Number(order.tax)} />
            <hr className="my-2" />
            <div className="flex items-center justify-between text-base font-bold">
              <span>Total</span>
              <span>{formatCurrency(Number(order.total))}</span>
            </div>
          </div>
        </Section>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          {canCancel && (
            <Button variant="outline" onClick={handleCancel} disabled={cancel.isPending}>
              <X className="mr-1 h-4 w-4" />
              {cancel.isPending ? 'Cancelling…' : 'Cancel order'}
            </Button>
          )}
          {isCompleted && (
            <Button variant="brand" onClick={handleReorder} disabled={reorder.isPending}>
              <RotateCcw className="mr-1 h-4 w-4" />
              {reorder.isPending ? 'Adding…' : 'Reorder'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border bg-card p-5">
      <h2 className="mb-3 text-base font-semibold">{title}</h2>
      {children}
    </section>
  )
}

function SummaryRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span>{formatCurrency(value)}</span>
    </div>
  )
}

function OrderDetailSkeleton() {
  return (
    <div className="container max-w-3xl space-y-5 py-8">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-44 rounded-2xl" />
      <Skeleton className="h-24 rounded-2xl" />
      <Skeleton className="h-32 rounded-2xl" />
      <Skeleton className="h-32 rounded-2xl" />
    </div>
  )
}
