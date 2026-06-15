'use client'

import { formatCurrency, OrderStatusBadge } from '@grab/ui'
import Link from 'next/link'

import type { Order } from '@/lib/api/orders.api'

interface OrderCardProps {
  order: Order
}

export function OrderCard({ order }: OrderCardProps) {
  const itemCount = order.items.reduce((sum, i) => sum + i.quantity, 0)
  const previewItems = order.items
    .slice(0, 2)
    .map((i) => `${i.quantity}× ${i.menuItemName}`)
    .join(', ')

  return (
    <Link
      href={`/orders/${order.id}`}
      className="flex items-start gap-4 rounded-2xl border bg-card p-4 transition-colors hover:border-brand"
    >
      <div className="flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="font-semibold">{order.restaurantName}</p>
          <OrderStatusBadge status={order.status} showIcon={false} />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {itemCount} item{itemCount !== 1 ? 's' : ''}
          {previewItems && ` · ${previewItems}`}
          {order.items.length > 2 && ` and ${order.items.length - 2} more`}
        </p>
        <div className="mt-2 flex items-center justify-between text-sm">
          <time dateTime={order.createdAt} className="text-muted-foreground">
            {formatDate(order.createdAt)}
          </time>
          <span className="font-semibold">{formatCurrency(order.total)}</span>
        </div>
      </div>
    </Link>
  )
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}
