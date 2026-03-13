'use client'

import { Button, EmptyState, Input, SkeletonRestaurantCard, useGeolocation } from '@grab/ui'
import { MapPin, Search, SlidersHorizontal, X } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'

import { RestaurantCard } from '@/components/home/restaurant-card'
import { SearchFilters } from '@/components/search/search-filters'
import { SortSelect } from '@/components/search/sort-select'
import { useInfiniteSearchRestaurants } from '@/hooks/use-search-query'
import type { SearchRestaurantsParams } from '@/lib/api/search.api'

export function SearchPageClient() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { lat, lng, getCurrentPosition, loading: geoLoading } = useGeolocation()

  const [query, setQuery] = useState(searchParams.get('q') ?? '')
  const [showFilters, setShowFilters] = useState(false)

  const params: Omit<SearchRestaurantsParams, 'page'> = {
    q: searchParams.get('q') ?? undefined,
    cuisine: searchParams.getAll('cuisine').length ? searchParams.getAll('cuisine') : undefined,
    sort: (searchParams.get('sort') as SearchRestaurantsParams['sort']) ?? 'relevance',
    priceRange: searchParams.get('price') ? Number(searchParams.get('price')) : undefined,
    minRating: searchParams.get('rating') ? Number(searchParams.get('rating')) : undefined,
    isOpen: searchParams.get('open') === 'true' ? true : undefined,
    lat: lat ?? undefined,
    lng: lng ?? undefined,
  }

  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useInfiniteSearchRestaurants(params)

  const allRestaurants = data?.pages.flatMap((p) => p.data) ?? []
  const total = data?.pages[0]?.total ?? 0

  // Infinite scroll sentinel
  const sentinelRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = sentinelRef.current
    if (!el || !hasNextPage) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void fetchNextPage()
      },
      { threshold: 0.1 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasNextPage, fetchNextPage])

  const updateParam = useCallback(
    (key: string, value: string | null) => {
      const p = new URLSearchParams(searchParams.toString())
      if (value) p.set(key, value)
      else p.delete(key)
      router.push(`/search?${p.toString()}`)
    },
    [router, searchParams],
  )

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    updateParam('q', query || null)
  }

  function handleGeolocate() {
    getCurrentPosition()
  }

  // The params object already includes lat/lng from state, so the query
  // will automatically refetch when they change — no explicit action needed.

  const activeFiltersCount = [
    searchParams.get('cuisine'),
    searchParams.get('price'),
    searchParams.get('rating'),
    searchParams.get('open'),
  ].filter(Boolean).length

  return (
    <div className="container py-6">
      {/* Search bar */}
      <form onSubmit={handleSearch} className="mb-6 flex gap-2">
        <Input
          leftIcon={<Search className="h-4 w-4" />}
          placeholder="Search restaurants or dishes..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1"
        />
        <Button type="submit" variant="brand">
          Search
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleGeolocate}
          loading={geoLoading}
          title="Use my location"
        >
          <MapPin className="h-4 w-4" />
        </Button>
      </form>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Filters sidebar — desktop */}
        <aside className="hidden w-60 shrink-0 lg:block">
          <SearchFilters searchParams={searchParams} onUpdate={updateParam} />
        </aside>

        {/* Results */}
        <div className="flex-1">
          {/* Toolbar */}
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFilters((v) => !v)}
                className="flex items-center gap-1.5 rounded-lg border bg-card px-3 py-1.5 text-sm font-medium lg:hidden"
              >
                <SlidersHorizontal className="h-4 w-4" />
                Filters
                {activeFiltersCount > 0 && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand text-[11px] font-bold text-brand-foreground">
                    {activeFiltersCount}
                  </span>
                )}
              </button>
              {!isLoading && (
                <p className="text-sm text-muted-foreground">
                  {total} restaurant{total !== 1 ? 's' : ''} found
                </p>
              )}
            </div>
            <SortSelect
              value={searchParams.get('sort') ?? 'relevance'}
              onChange={(v) => updateParam('sort', v)}
            />
          </div>

          {/* Mobile filters drawer */}
          {showFilters && (
            <div className="mb-4 rounded-xl border bg-card p-4 lg:hidden">
              <div className="mb-3 flex items-center justify-between">
                <span className="font-semibold">Filters</span>
                <button onClick={() => setShowFilters(false)}>
                  <X className="h-4 w-4" />
                </button>
              </div>
              <SearchFilters searchParams={searchParams} onUpdate={updateParam} />
            </div>
          )}

          {/* Loading skeletons */}
          {isLoading && (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonRestaurantCard key={i} />
              ))}
            </div>
          )}

          {/* Empty state */}
          {!isLoading && allRestaurants.length === 0 && (
            <EmptyState
              icon={<Search className="h-8 w-8" />}
              title="No restaurants found"
              description="Try adjusting your filters or search term."
            />
          )}

          {/* Results grid */}
          {allRestaurants.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {allRestaurants.map((r) => (
                <RestaurantCard key={r.id} restaurant={r} />
              ))}
            </div>
          )}

          {/* Infinite scroll sentinel */}
          <div ref={sentinelRef} className="mt-4">
            {isFetchingNextPage && (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <SkeletonRestaurantCard key={i} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
