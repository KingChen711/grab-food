'use client'

import { EmptyState, Skeleton } from '@grab/ui'
import { UtensilsCrossed } from 'lucide-react'

import { MenuTabs } from '@/components/restaurant/menu-tabs'
import { RestaurantHeader } from '@/components/restaurant/restaurant-header'
import { ReviewsSection } from '@/components/restaurant/reviews-section'
import { useRestaurantBySlug, useRestaurantMenu } from '@/hooks/use-restaurant-query'

interface RestaurantPageClientProps {
  slug: string
}

export function RestaurantPageClient({ slug }: RestaurantPageClientProps) {
  const { data: restaurant, isLoading, isError } = useRestaurantBySlug(slug)
  const { data: menu, isLoading: menuLoading } = useRestaurantMenu(restaurant?.id ?? '')

  if (isLoading) {
    return (
      <div>
        <Skeleton className="h-64 w-full" />
        <div className="container mt-6 space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-80" />
        </div>
      </div>
    )
  }

  if (isError || !restaurant) {
    return (
      <div className="container py-16">
        <EmptyState
          icon={<UtensilsCrossed className="h-8 w-8" />}
          title="Restaurant not found"
          description="This restaurant may have moved or closed."
        />
      </div>
    )
  }

  return (
    <div>
      <RestaurantHeader restaurant={restaurant} />
      <div className="container py-6">
        <MenuTabs restaurant={restaurant} menu={menu ?? []} isLoading={menuLoading} />
        <ReviewsSection restaurantId={restaurant.id} />
      </div>
    </div>
  )
}
