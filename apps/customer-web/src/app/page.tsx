import type { Metadata } from 'next'

import { Footer } from '@/components/layout/footer'
import { MobileNav } from '@/components/layout/mobile-nav'
import { Navbar } from '@/components/layout/navbar'

import { HomeCTAs } from './_home-ctas'

export const metadata: Metadata = {
  title: 'Home',
  description: 'Order from the best restaurants near you. Fast delivery, great food.',
}

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main id="main-content" className="flex-1">
        {/* Hero */}
        <section className="bg-gradient-to-b from-brand-50 to-background py-20 dark:from-brand-900/20">
          <div className="container text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              Food delivery <span className="text-brand">at your door</span>
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
              Order from the best restaurants near you. Fast delivery, great food.
            </p>
            <HomeCTAs />
          </div>
        </section>

        {/* Placeholder sections */}
        <section className="container py-16">
          <h2 className="mb-8 text-2xl font-bold">Coming in Phase 2</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {['Restaurant Search', 'Real-time Tracking', 'Easy Checkout'].map((feature) => (
              <div key={feature} className="rounded-xl border bg-card p-6">
                <h3 className="font-semibold">{feature}</h3>
                <p className="mt-2 text-sm text-muted-foreground">Coming soon...</p>
              </div>
            ))}
          </div>
        </section>
      </main>
      <Footer />
      <MobileNav />
    </div>
  )
}
