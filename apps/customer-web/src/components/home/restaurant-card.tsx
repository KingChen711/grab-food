import { Badge, Rating } from '@grab/ui'
import { Clock, Truck } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

import type { RestaurantResult } from '@/lib/api/search.api'

interface RestaurantCardProps {
  restaurant: RestaurantResult
}

const PRICE_LABELS: Record<number, string> = { 1: '$', 2: '$$', 3: '$$$', 4: '$$$$' }

export function RestaurantCard({ restaurant }: RestaurantCardProps) {
  return (
    <Link
      href={`/restaurant/${restaurant.slug}`}
      className="group block overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-card-hover"
    >
      {/* Cover image */}
      <div className="relative h-44 w-full overflow-hidden bg-muted">
        {restaurant.coverImageUrl ? (
          <Image
            src={restaurant.coverImageUrl}
            alt={restaurant.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl">🍽️</div>
        )}
        {!restaurant.isOpen && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <span className="rounded-full bg-background/90 px-3 py-1 text-sm font-medium text-foreground">
              Closed
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold leading-tight">{restaurant.name}</h3>
          <span className="shrink-0 text-sm text-muted-foreground">
            {PRICE_LABELS[restaurant.priceRange] ?? '$'}
          </span>
        </div>

        <p className="mt-1 text-sm text-muted-foreground">
          {restaurant.cuisineTypes.slice(0, 2).join(' · ')}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <Rating value={restaurant.avgRating} size="sm" showValue />
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {restaurant.avgPrepTimeMinutes} min
          </span>
          <span className="flex items-center gap-1">
            <Truck className="h-3.5 w-3.5" />
            {restaurant.deliveryFee === 0
              ? 'Free delivery'
              : `$${restaurant.deliveryFee.toFixed(2)}`}
          </span>
        </div>

        {restaurant.totalOrders > 100 && (
          <div className="mt-3">
            <Badge variant="brand" className="text-xs">
              Popular
            </Badge>
          </div>
        )}
      </div>
    </Link>
  )
}
