'use client'

import type { OrderStatus } from '@/lib/api/orders.api'

export type OrderFilter = 'all' | 'active' | 'completed' | 'cancelled'

const FILTERS: { value: OrderFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

const ACTIVE_STATUSES: OrderStatus[] = [
  'CREATED',
  'PENDING',
  'CONFIRMED',
  'PREPARING',
  'READY',
  'PICKED_UP',
  'DELIVERING',
]

export function matchesFilter(status: OrderStatus, filter: OrderFilter): boolean {
  if (filter === 'all') return true
  if (filter === 'active') return ACTIVE_STATUSES.includes(status)
  if (filter === 'completed') return status === 'DELIVERED' || status === 'COMPLETED'
  if (filter === 'cancelled') return status === 'CANCELLED'
  return true
}

interface OrderStatusFilterProps {
  value: OrderFilter
  onChange: (value: OrderFilter) => void
}

export function OrderStatusFilter({ value, onChange }: OrderStatusFilterProps) {
  return (
    <div className="flex gap-1 overflow-x-auto rounded-lg border bg-card p-1">
      {FILTERS.map((f) => (
        <button
          key={f.value}
          onClick={() => onChange(f.value)}
          className={`whitespace-nowrap rounded px-3 py-1.5 text-sm font-medium transition-colors ${
            value === f.value
              ? 'bg-brand text-brand-foreground'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground'
          }`}
        >
          {f.label}
        </button>
      ))}
    </div>
  )
}
