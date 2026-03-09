import { CheckCircle2, ChefHat, Clock, Package, Truck, XCircle } from 'lucide-react'
import * as React from 'react'

import type { OrderStatus } from '@grab/types'

import { cn } from '../lib/utils'
import { Badge } from './badge'

interface OrderStatusBadgeProps {
  status: OrderStatus
  showIcon?: boolean
  className?: string
}

const statusConfig: Record<
  OrderStatus,
  {
    label: string
    variant: 'default' | 'secondary' | 'destructive' | 'success' | 'warning' | 'info' | 'brand'
    icon: React.ComponentType<{ className?: string }>
    className?: string
  }
> = {
  CREATED: { label: 'Đã tạo', variant: 'secondary', icon: Clock },
  PENDING: { label: 'Đang chờ', variant: 'warning', icon: Clock },
  CONFIRMED: { label: 'Đã xác nhận', variant: 'info', icon: CheckCircle2 },
  PREPARING: { label: 'Đang chuẩn bị', variant: 'warning', icon: ChefHat },
  READY: { label: 'Sẵn sàng', variant: 'brand', icon: Package },
  PICKED_UP: { label: 'Đã lấy hàng', variant: 'brand', icon: Truck },
  DELIVERING: { label: 'Đang giao', variant: 'info', icon: Truck },
  DELIVERED: { label: 'Đã giao', variant: 'success', icon: CheckCircle2 },
  COMPLETED: { label: 'Hoàn thành', variant: 'success', icon: CheckCircle2 },
  CANCELLED: { label: 'Đã hủy', variant: 'destructive', icon: XCircle },
  REFUNDED: { label: 'Đã hoàn tiền', variant: 'secondary', icon: CheckCircle2 },
}

function OrderStatusBadge({ status, showIcon = true, className }: OrderStatusBadgeProps) {
  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <Badge variant={config.variant} className={cn(className)}>
      {showIcon && <Icon className="h-3 w-3" />}
      {config.label}
    </Badge>
  )
}

export { OrderStatusBadge }
