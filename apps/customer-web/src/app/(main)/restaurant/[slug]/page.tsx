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

export default async function RestaurantPage({ params }: Props) {
  const { slug } = await params
  return (
    <Suspense>
      <RestaurantPageClient slug={slug} />
    </Suspense>
  )
}
