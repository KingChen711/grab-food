'use client'

import { Button } from '@grab/ui'

export default function MainError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
      <h2 className="text-2xl font-bold">Something went wrong</h2>
      <p className="mt-2 max-w-md text-muted-foreground">
        An unexpected error occurred. Please try again.
      </p>
      <Button onClick={reset} className="mt-6">
        Try again
      </Button>
    </div>
  )
}
