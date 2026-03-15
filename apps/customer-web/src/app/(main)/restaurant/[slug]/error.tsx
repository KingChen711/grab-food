'use client'

import Link from 'next/link'

export default function RestaurantError({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="container flex min-h-[50vh] flex-col items-center justify-center text-center">
      <h2 className="text-2xl font-bold">Something went wrong</h2>
      <p className="mt-2 max-w-md text-muted-foreground">
        We couldn&apos;t load this restaurant. Please try again.
      </p>
      <div className="mt-6 flex gap-3">
        <button
          onClick={reset}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Try again
        </button>
        <Link
          href="/search"
          className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent"
        >
          Browse restaurants
        </Link>
      </div>
    </div>
  )
}
