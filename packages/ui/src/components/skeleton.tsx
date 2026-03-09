import * as React from 'react'

import { cn } from '../lib/utils'

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('animate-pulse rounded-md bg-muted', className)} {...props} />
}

// ─── Preset Skeletons ─────────────────────────────────────────────────────────

function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn('h-4', i === lines - 1 && lines > 1 ? 'w-3/4' : 'w-full')}
        />
      ))}
    </div>
  )
}

function SkeletonAvatar({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-14 w-14',
  }[size]

  return <Skeleton className={cn('rounded-full', sizeClass)} />
}

function SkeletonCard() {
  return (
    <div className="space-y-4 rounded-xl border bg-card p-4">
      <Skeleton className="h-48 w-full rounded-lg" />
      <div className="space-y-2">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-20" />
      </div>
    </div>
  )
}

function SkeletonRestaurantCard() {
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <Skeleton className="h-44 w-full" />
      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-5 w-12" />
        </div>
        <Skeleton className="h-4 w-32" />
        <div className="flex items-center gap-3">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-14" />
        </div>
      </div>
    </div>
  )
}

function SkeletonOrderItem() {
  return (
    <div className="flex items-center gap-4 p-4">
      <Skeleton className="h-16 w-16 flex-shrink-0 rounded-lg" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-4 w-20" />
      </div>
    </div>
  )
}

export {
  Skeleton,
  SkeletonAvatar,
  SkeletonCard,
  SkeletonOrderItem,
  SkeletonRestaurantCard,
  SkeletonText,
}
