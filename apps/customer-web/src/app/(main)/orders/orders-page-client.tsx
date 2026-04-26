'use client'

import { EmptyState, Skeleton } from '@grab/ui'
import { ClipboardList } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'

import { OrderCard } from '@/components/orders/order-card'
import {
  matchesFilter,
  type OrderFilter,
  OrderStatusFilter,
} from '@/components/orders/order-status-filter'
import { useMyOrders } from '@/hooks/use-orders-query'

export function OrdersPageClient() {
  const router = useRouter()
  const { data: orders, isLoading } = useMyOrders()
  const [filter, setFilter] = useState<OrderFilter>('all')

  const filtered = useMemo(
    () => (orders ?? []).filter((o) => matchesFilter(o.status, filter)),
    [orders, filter],
  )

  return (
    <div className="container max-w-3xl py-8">
      <h1 className="mb-2 text-2xl font-bold">My orders</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Track active deliveries and review past orders.
      </p>

      <div className="mb-4">
        <OrderStatusFilter value={filter} onChange={setFilter} />
      </div>

      {isLoading ? (
        <OrdersSkeleton />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="h-12 w-12" />}
          title={filter === 'all' ? 'No orders yet' : `No ${filter} orders`}
          description={
            filter === 'all'
              ? 'Your orders will appear here once you place one.'
              : 'Try a different filter to see other orders.'
          }
          action={
            filter === 'all'
              ? { label: 'Find restaurants', onClick: () => router.push('/search') }
              : undefined
          }
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  )
}

function OrdersSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-24 rounded-2xl" />
      ))}
    </div>
  )
}
