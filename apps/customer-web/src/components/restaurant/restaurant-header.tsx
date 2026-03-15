import { Badge, Rating } from '@grab/ui'
import { Clock, MapPin, Phone, Truck, UtensilsCrossed } from 'lucide-react'
import Image from 'next/image'

import type { Restaurant } from '@/lib/api/restaurant.api'

const PRICE_LABELS: Record<number, string> = { 1: '$', 2: '$$', 3: '$$$', 4: '$$$$' }

interface RestaurantHeaderProps {
  restaurant: Restaurant
}

export function RestaurantHeader({ restaurant }: RestaurantHeaderProps) {
  return (
    <div>
      {/* Cover image */}
      <div className="relative h-48 w-full overflow-hidden bg-muted sm:h-64 md:h-80">
        {restaurant.coverImageUrl ? (
          <Image
            src={restaurant.coverImageUrl}
            alt={restaurant.name}
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <UtensilsCrossed className="h-16 w-16 text-muted-foreground/30" aria-hidden="true" />
          </div>
        )}
        {!restaurant.isOpen && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <span className="rounded-full bg-background/90 px-4 py-2 text-base font-semibold">
              Currently closed
            </span>
          </div>
        )}
      </div>

      {/* Info bar */}
      <div className="container -mt-8 pb-4">
        <div className="flex items-end gap-4">
          {/* Logo */}
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-4 border-background bg-muted shadow-lg">
            {restaurant.logoUrl ? (
              <Image src={restaurant.logoUrl} alt={restaurant.name} fill className="object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center">
                <UtensilsCrossed className="h-8 w-8 text-muted-foreground/40" aria-hidden="true" />
              </div>
            )}
          </div>

          {/* Name + badges */}
          <div className="min-w-0 flex-1 pt-10">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold leading-tight">{restaurant.name}</h1>
              <span className="text-sm text-muted-foreground">
                {PRICE_LABELS[restaurant.priceRange] ?? '$'}
              </span>
              {restaurant.isOpen ? (
                <Badge variant="brand" className="text-xs">
                  Open
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-xs">
                  Closed
                </Badge>
              )}
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {restaurant.cuisineTypes.join(' · ')}
            </p>
          </div>
        </div>

        {/* Stats row */}
        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <Rating value={restaurant.avgRating} size="sm" showValue />
          <span className="text-muted-foreground">({restaurant.totalReviews} reviews)</span>
          <span className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {restaurant.avgPrepTimeMinutes} min
          </span>
          <span className="flex items-center gap-1">
            <Truck className="h-4 w-4" />
            {restaurant.deliveryFee === 0
              ? 'Free delivery'
              : `$${Number(restaurant.deliveryFee).toFixed(2)} delivery`}
          </span>
          {restaurant.minOrderAmount > 0 && (
            <span>Min. ${Number(restaurant.minOrderAmount).toFixed(2)}</span>
          )}
        </div>

        {/* Address & phone */}
        <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <MapPin className="h-4 w-4 shrink-0" />
            {restaurant.fullAddress}
          </span>
          <span className="flex items-center gap-1">
            <Phone className="h-4 w-4 shrink-0" />
            {restaurant.phone}
          </span>
        </div>

        {restaurant.description && (
          <p className="mt-3 text-sm text-muted-foreground">{restaurant.description}</p>
        )}
      </div>
    </div>
  )
}
