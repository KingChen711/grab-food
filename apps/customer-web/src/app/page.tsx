import type { Metadata } from 'next'

import { CuisineCategories } from '@/components/home/cuisine-categories'
import { PopularRestaurants } from '@/components/home/popular-restaurants'
import { PromotionsBanner } from '@/components/home/promotions-banner'
import { SearchBar } from '@/components/home/search-bar'
import { Footer } from '@/components/layout/footer'
import { MobileNav } from '@/components/layout/mobile-nav'
import { Navbar } from '@/components/layout/navbar'

export const metadata: Metadata = {
  title: 'Home',
  description: 'Order from the best restaurants near you. Fast delivery, great food.',
}

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main id="main-content" className="flex-1">
        {/* Hero + Search */}
        <section className="bg-gradient-to-b from-brand-50 to-background py-16 dark:from-brand-900/20">
          <div className="container text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              Food delivery <span className="text-brand">at your door</span>
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
              Order from the best restaurants near you. Fast delivery, great food.
            </p>
            <SearchBar />
          </div>
        </section>

        {/* Cuisine categories */}
        <CuisineCategories />

        {/* Promotions */}
        <PromotionsBanner />

        {/* Popular restaurants */}
        <PopularRestaurants />
      </main>

      <Footer />
      <MobileNav />
    </div>
  )
}
