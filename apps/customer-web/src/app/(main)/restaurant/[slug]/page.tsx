import type { Metadata } from 'next'
import { Suspense } from 'react'

import { RestaurantPageClient } from './_client'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  return {
    title: slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
  }
}

function RestaurantPageFallback() {
  return (
    <div>
      <div className="h-48 w-full animate-pulse bg-muted sm:h-64 md:h-80" />
      <div className="container mt-6 space-y-4">
        <div className="h-8 w-64 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-48 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-80 animate-pulse rounded-md bg-muted" />
      </div>
    </div>
  )
}

export default async function RestaurantPage({ params }: Props) {
  const { slug } = await params
  return (
    <Suspense fallback={<RestaurantPageFallback />}>
      <RestaurantPageClient slug={slug} />
    </Suspense>
  )
}
