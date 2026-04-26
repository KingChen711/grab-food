'use client'

import { EmptyState, Skeleton } from '@grab/ui'
import { ClipboardList } from 'lucide-react'
import { useMemo } from 'react'
import { toast } from 'sonner'

import { OrderCard } from '@/components/orders/order-card'
import { useMyRestaurant } from '@/hooks/use-restaurant'
import {
  useCancelOrder,
  useConfirmOrder,
  useMarkReady,
  useRestaurantOrders,
  useStartPreparing,
} from '@/hooks/use-orders'
import type { Order, OrderStatus } from '@/lib/api/orders.api'

const ACTIVE_STATUSES: OrderStatus[] = ['CREATED', 'PENDING', 'CONFIRMED', 'PREPARING', 'READY']

const HISTORY_STATUSES: OrderStatus[] = [
  'PICKED_UP',
  'DELIVERING',
  'DELIVERED',
  'COMPLETED',
  'CANCELLED',
]

const DEFAULT_PREP_MINUTES = 20

export function OrdersPageClient() {
  const { restaurant, isLoading: restLoading } = useMyRestaurant()
  const restaurantId = restaurant?.id
  const { data: orders, isLoading } = useRestaurantOrders(restaurantId)

  const confirm = useConfirmOrder(restaurantId)
  const startPreparing = useStartPreparing(restaurantId)
  const markReady = useMarkReady(restaurantId)
  const cancel = useCancelOrder(restaurantId)

  const isMutating =
    confirm.isPending || startPreparing.isPending || markReady.isPending || cancel.isPending

  const incoming = useMemo(
    () => (orders ?? []).filter((o) => o.status === 'CREATED' || o.status === 'PENDING'),
    [orders],
  )
  const active = useMemo(
    () =>
      (orders ?? []).filter(
        (o) => o.status === 'CONFIRMED' || o.status === 'PREPARING' || o.status === 'READY',
      ),
    [orders],
  )
  const history = useMemo(
    () => (orders ?? []).filter((o) => HISTORY_STATUSES.includes(o.status)).slice(0, 20),
    [orders],
  )

  if (restLoading || isLoading) return <OrdersSkeleton />

  function handleConfirm(order: Order) {
    confirm.mutate(
      { id: order.id, prepMinutes: DEFAULT_PREP_MINUTES },
      {
        onSuccess: () => toast.success(`Order #${order.id.slice(0, 8)} accepted`),
        onError: () => toast.error('Failed to accept order'),
      },
    )
  }

  function handleReject(order: Order) {
    if (!window.confirm(`Reject order #${order.id.slice(0, 8)}?`)) return
    cancel.mutate(
      { id: order.id, reason: 'RESTAURANT_REJECTED' },
      {
        onSuccess: () => toast.success('Order rejected'),
        onError: () => toast.error('Failed to reject'),
      },
    )
  }

  function handleStartPreparing(order: Order) {
    startPreparing.mutate(order.id, {
      onSuccess: () => toast.success('Preparation started'),
      onError: () => toast.error('Failed to update status'),
    })
  }

  function handleMarkReady(order: Order) {
    markReady.mutate(order.id, {
      onSuccess: () => toast.success('Order marked ready'),
      onError: () => toast.error('Failed to update status'),
    })
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Orders</h1>
        <p className="text-sm text-muted-foreground">Live feed — auto-refreshes every 5 seconds.</p>
      </div>

      {!orders || orders.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="h-12 w-12" />}
          title="No orders yet"
          description="New orders will appear here automatically."
        />
      ) : (
        <>
          <Section title="Incoming" count={incoming.length} highlight>
            {incoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">No new orders.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {incoming.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onConfirm={() => handleConfirm(order)}
                    onReject={() => handleReject(order)}
                    onStartPreparing={() => handleStartPreparing(order)}
                    onMarkReady={() => handleMarkReady(order)}
                    isMutating={isMutating}
                  />
                ))}
              </div>
            )}
          </Section>

          <Section title="In progress" count={active.length}>
            {active.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing in progress.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {active.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onConfirm={() => handleConfirm(order)}
                    onReject={() => handleReject(order)}
                    onStartPreparing={() => handleStartPreparing(order)}
                    onMarkReady={() => handleMarkReady(order)}
                    isMutating={isMutating}
                  />
                ))}
              </div>
            )}
          </Section>

          {history.length > 0 && (
            <Section title="Recent" count={history.length}>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {history.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onConfirm={() => handleConfirm(order)}
                    onReject={() => handleReject(order)}
                    onStartPreparing={() => handleStartPreparing(order)}
                    onMarkReady={() => handleMarkReady(order)}
                    isMutating={isMutating}
                  />
                ))}
              </div>
            </Section>
          )}
        </>
      )}
    </div>
  )
}

function Section({
  title,
  count,
  highlight,
  children,
}: {
  title: string
  count: number
  highlight?: boolean
  children: React.ReactNode
}) {
  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
        {title}
        <span
          className={`rounded-full px-2 py-0.5 text-xs ${
            highlight && count > 0
              ? 'bg-brand text-brand-foreground'
              : 'bg-muted text-muted-foreground'
          }`}
        >
          {count}
        </span>
      </h2>
      {children}
    </section>
  )
}

function OrdersSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-32" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-56 rounded-2xl" />
        ))}
      </div>
    </div>
  )
}
