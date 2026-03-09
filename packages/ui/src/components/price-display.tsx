import * as React from 'react'

import { cn } from '../lib/utils'
import { formatCurrency } from '../lib/utils'

interface PriceDisplayProps {
  amount: number
  currency?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  originalPrice?: number
  className?: string
  locale?: string
}

function PriceDisplay({
  amount,
  currency = 'VND',
  size = 'md',
  originalPrice,
  className,
  locale = 'vi-VN',
}: PriceDisplayProps) {
  const sizeClass = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg font-semibold',
    xl: 'text-2xl font-bold',
  }[size]

  const discountPercent =
    originalPrice && originalPrice > amount
      ? Math.round(((originalPrice - amount) / originalPrice) * 100)
      : null

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span className={cn('font-semibold text-foreground', sizeClass)}>
        {formatCurrency(amount, currency, locale)}
      </span>
      {originalPrice && originalPrice > amount && (
        <>
          <span
            className={cn(
              'text-muted-foreground line-through',
              size === 'xl' ? 'text-lg' : 'text-sm',
            )}
          >
            {formatCurrency(originalPrice, currency, locale)}
          </span>
          {discountPercent && (
            <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-xs font-semibold text-destructive">
              -{discountPercent}%
            </span>
          )}
        </>
      )}
    </div>
  )
}

export { PriceDisplay }
