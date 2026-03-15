'use client'

import { Button, EmptyState, SkeletonRestaurantCard } from '@grab/ui'
import { UtensilsCrossed } from 'lucide-react'
import Link from 'next/link'

import { usePopularRestaurants } from '@/hooks/use-search-query'

import { RestaurantCard } from './restaurant-card'

export function PopularRestaurants() {
  const { data, isLoading, isError } = usePopularRestaurants(8)

  return (
    <section className="container py-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Popular near you</h2>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/search">View all</Link>
        </Button>
      </div>

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonRestaurantCard key={i} />
          ))}
        </div>
      )}

      {isError && (
        <EmptyState
          icon={<UtensilsCrossed className="h-8 w-8" />}
          title="Couldn't load restaurants"
          description="Please try again later."
        />
      )}

      {data && data.data.length === 0 && (
        <EmptyState
          icon={<UtensilsCrossed className="h-8 w-8" />}
          title="No restaurants yet"
          description="Check back soon — more restaurants are joining."
        />
      )}

      {data && data.data.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {data.data.map((restaurant) => (
            <RestaurantCard key={restaurant.id} restaurant={restaurant} />
          ))}
        </div>
      )}
    </section>
  )
}
