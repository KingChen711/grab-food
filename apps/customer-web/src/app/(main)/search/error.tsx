'use client'

export default function SearchError({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="container flex min-h-[50vh] flex-col items-center justify-center text-center">
      <h2 className="text-2xl font-bold">Search unavailable</h2>
      <p className="mt-2 max-w-md text-muted-foreground">
        We couldn&apos;t load search results. Please try again.
      </p>
      <button
        onClick={reset}
        className="mt-6 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Try again
      </button>
    </div>
  )
}
