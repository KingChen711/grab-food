import type { Metadata } from 'next'
import { Suspense } from 'react'

import { SearchPageClient } from './_client'

export const metadata: Metadata = {
  title: 'Search Restaurants',
  description: 'Find restaurants near you',
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchPageClient />
    </Suspense>
  )
}
