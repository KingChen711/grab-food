'use client'

import { Button, Skeleton } from '@grab/ui'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Star, TrendingUp, UtensilsCrossed } from 'lucide-react'
import { toast } from 'sonner'

import { restaurantQueryKeys, useMyRestaurant } from '@/hooks/use-restaurant'
import { restaurantApi } from '@/lib/api/restaurant.api'

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function formatDate(date: Date) {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export default function DashboardPage() {
  const { restaurant, isLoading } = useMyRestaurant()
  const queryClient = useQueryClient()

  const toggleOpen = useMutation({
    mutationFn: () => restaurantApi.toggleOpen(restaurant!.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: restaurantQueryKeys.myRestaurants })
      toast.success(`Restaurant is now ${restaurant?.isOpen ? 'closed' : 'open'}`)
    },
    onError: () => toast.error('Failed to update restaurant status'),
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  const stats = [
    {
      label: "Today's Orders",
      value: '—',
      icon: UtensilsCrossed,
      color: 'text-blue-500',
    },
    {
      label: 'Revenue',
      value: '—',
      icon: TrendingUp,
      color: 'text-green-500',
    },
    {
      label: 'Avg Rating',
      value: restaurant ? restaurant.avgRating.toFixed(1) : '—',
      icon: Star,
      color: 'text-yellow-500',
    },
    {
      label: 'Total Reviews',
      value: restaurant ? String(restaurant.totalReviews) : '—',
      icon: Star,
      color: 'text-purple-500',
    },
  ]

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">
          {getGreeting()}, {restaurant?.name ?? 'Restaurant'}
        </h2>
        <p className="text-muted-foreground">{formatDate(new Date())}</p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-lg border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">{label}</p>
              <Icon className={`h-5 w-5 ${color}`} />
            </div>
            <p className="mt-2 text-3xl font-bold">{value}</p>
          </div>
        ))}
      </div>

      {/* Restaurant status card */}
      <div className="rounded-lg border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold">Restaurant Status</h3>
            <p className="text-sm text-muted-foreground">
              Your restaurant is currently{' '}
              <span
                className={
                  restaurant?.isOpen ? 'font-medium text-green-600' : 'font-medium text-red-500'
                }
              >
                {restaurant?.isOpen ? 'open' : 'closed'}
              </span>
            </p>
          </div>
          <Button
            variant={restaurant?.isOpen ? 'destructive' : 'default'}
            onClick={() => toggleOpen.mutate()}
            loading={toggleOpen.isPending}
            disabled={!restaurant}
          >
            {restaurant?.isOpen ? 'Close Restaurant' : 'Open Restaurant'}
          </Button>
        </div>
      </div>

      {/* Recent activity */}
      <div className="rounded-lg border bg-card p-5 shadow-sm">
        <h3 className="mb-4 text-base font-semibold">Recent Activity</h3>
        <p className="text-sm text-muted-foreground">No recent activity to show.</p>
      </div>
    </div>
  )
}
