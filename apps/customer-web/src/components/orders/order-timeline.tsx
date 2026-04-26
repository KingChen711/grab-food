'use client'

import type { OrderStatus, OrderTimelineEntry } from '@/lib/api/orders.api'

const STATUS_LABELS: Record<OrderStatus, string> = {
  CREATED: 'Order placed',
  PENDING: 'Awaiting confirmation',
  CONFIRMED: 'Restaurant confirmed',
  PREPARING: 'Preparing your food',
  READY: 'Ready for pickup',
  PICKED_UP: 'Driver picked up',
  DELIVERING: 'On the way',
  DELIVERED: 'Delivered',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
}

const STATUS_FLOW: OrderStatus[] = [
  'CREATED',
  'CONFIRMED',
  'PREPARING',
  'READY',
  'PICKED_UP',
  'DELIVERING',
  'DELIVERED',
]

interface OrderTimelineProps {
  current: OrderStatus
  events?: OrderTimelineEntry[]
}

export function OrderTimeline({ current, events }: OrderTimelineProps) {
  if (current === 'CANCELLED') {
    return (
      <div className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
        This order was cancelled.
      </div>
    )
  }

  const eventByStatus = new Map<OrderStatus, OrderTimelineEntry>()
  for (const e of events ?? []) eventByStatus.set(e.status, e)

  const currentIndex = STATUS_FLOW.indexOf(current)

  return (
    <ol className="relative space-y-4 border-l-2 pl-6">
      {STATUS_FLOW.map((status, i) => {
        const reached = i <= currentIndex
        const isCurrent = i === currentIndex
        const event = eventByStatus.get(status)
        return (
          <li key={status} className="relative">
            <span
              className={`absolute -left-[33px] flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                reached
                  ? 'border-brand bg-brand text-brand-foreground'
                  : 'border-muted-foreground/30 bg-background'
              } ${isCurrent ? 'ring-4 ring-brand/20' : ''}`}
            >
              {reached && <span className="h-1.5 w-1.5 rounded-full bg-brand-foreground" />}
            </span>
            <div className="flex items-center justify-between">
              <p
                className={`font-medium ${
                  reached ? 'text-foreground' : 'text-muted-foreground'
                } ${isCurrent ? 'text-brand' : ''}`}
              >
                {STATUS_LABELS[status]}
              </p>
              {event && (
                <time
                  dateTime={event.occurredAt}
                  className="text-xs text-muted-foreground"
                  suppressHydrationWarning
                >
                  {new Date(event.occurredAt).toLocaleTimeString('en-GB', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </time>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
