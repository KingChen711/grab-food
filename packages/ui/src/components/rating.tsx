'use client'

import { Star } from 'lucide-react'
import * as React from 'react'

import { cn } from '../lib/utils'

interface RatingProps {
  value: number
  max?: number
  size?: 'sm' | 'md' | 'lg'
  interactive?: boolean
  onChange?: (value: number) => void
  showValue?: boolean
  showCount?: number
  className?: string
}

function Rating({
  value,
  max = 5,
  size = 'md',
  interactive = false,
  onChange,
  showValue = false,
  showCount,
  className,
}: RatingProps) {
  const [hovered, setHovered] = React.useState<number | null>(null)

  const sizeClass = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  }[size]

  const textSize = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  }[size]

  const displayValue = hovered ?? value

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <div className="flex items-center">
        {Array.from({ length: max }).map((_, i) => {
          const starValue = i + 1
          const isFilled = starValue <= Math.floor(displayValue)
          const isPartial =
            !isFilled && starValue === Math.ceil(displayValue) && displayValue % 1 > 0

          return (
            <button
              key={i}
              type={interactive ? 'button' : undefined}
              className={cn(
                'transition-transform duration-100',
                interactive && 'cursor-pointer hover:scale-110',
                !interactive && 'cursor-default',
              )}
              onClick={() => interactive && onChange?.(starValue)}
              onMouseEnter={() => interactive && setHovered(starValue)}
              onMouseLeave={() => interactive && setHovered(null)}
            >
              <Star
                className={cn(
                  sizeClass,
                  'transition-colors duration-100',
                  isFilled || isPartial
                    ? 'fill-amber-400 text-amber-400'
                    : 'fill-transparent text-muted-foreground/40',
                )}
              />
            </button>
          )
        })}
      </div>

      {(showValue || showCount !== undefined) && (
        <span className={cn('text-muted-foreground', textSize)}>
          {showValue && <span className="font-semibold text-foreground">{value.toFixed(1)}</span>}
          {showCount !== undefined && <span className="ml-1">({showCount.toLocaleString()})</span>}
        </span>
      )}
    </div>
  )
}

export { Rating }
