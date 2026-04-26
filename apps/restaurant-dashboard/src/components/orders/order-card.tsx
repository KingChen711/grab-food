'use client'

import { Button, formatCurrency, OrderStatusBadge } from '@grab/ui'
import { Check, ChefHat, Clock, Package, X } from 'lucide-react'

import type { Order } from '@/lib/api/orders.api'

interface OrderCardProps {
  order: Order
  onConfirm: () => void
  onReject: () => void
  onStartPreparing: () => void
  onMarkReady: () => void
  isMutating?: boolean
}

export function OrderCard({
  order,
  onConfirm,
  onReject,
  onStartPreparing,
  onMarkReady,
  isMutating,
}: OrderCardProps) {
  const itemCount = order.items.reduce((sum, i) => sum + i.quantity, 0)

  return (
    <div className="rounded-2xl border bg-card p-4 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-semibold">#{order.id.slice(0, 8)}</p>
            <OrderStatusBadge status={order.status} showIcon={false} />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {new Date(order.createdAt).toLocaleTimeString('en-GB', {
              hour: '2-digit',
              minute: '2-digit',
            })}{' '}
            · {itemCount} item{itemCount !== 1 ? 's' : ''}
          </p>
        </div>
        <p className="whitespace-nowrap font-bold">{formatCurrency(Number(order.total))}</p>
      </div>

      <ul className="mt-3 space-y-1 text-sm">
        {order.items.slice(0, 4).map((item) => (
          <li key={item.id} className="flex items-start gap-2">
            <span className="font-medium">{item.quantity}×</span>
            <span className="flex-1">
              {item.menuItemName}
              {item.notes && (
                <span className="block text-xs italic text-muted-foreground">{item.notes}</span>
              )}
            </span>
          </li>
        ))}
        {order.items.length > 4 && (
          <li className="text-xs text-muted-foreground">
            +{order.items.length - 4} more item{order.items.length - 4 !== 1 ? 's' : ''}
          </li>
        )}
      </ul>

      {order.notes && (
        <div className="mt-3 rounded-md bg-muted/50 p-2 text-xs">
          <span className="font-medium">Customer note: </span>
          {order.notes}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {(order.status === 'CREATED' || order.status === 'PENDING') && (
          <>
            <Button
              size="sm"
              variant="brand"
              onClick={onConfirm}
              disabled={isMutating}
              className="flex-1"
            >
              <Check className="mr-1 h-4 w-4" />
              Accept
            </Button>
            <Button size="sm" variant="outline" onClick={onReject} disabled={isMutating}>
              <X className="mr-1 h-4 w-4" />
              Reject
            </Button>
          </>
        )}
        {order.status === 'CONFIRMED' && (
          <Button
            size="sm"
            variant="brand"
            onClick={onStartPreparing}
            disabled={isMutating}
            className="flex-1"
          >
            <ChefHat className="mr-1 h-4 w-4" />
            Start preparing
          </Button>
        )}
        {order.status === 'PREPARING' && (
          <Button
            size="sm"
            variant="brand"
            onClick={onMarkReady}
            disabled={isMutating}
            className="flex-1"
          >
            <Package className="mr-1 h-4 w-4" />
            Mark ready
          </Button>
        )}
        {order.status === 'READY' && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" /> Waiting for driver…
          </p>
        )}
      </div>
    </div>
  )
}
