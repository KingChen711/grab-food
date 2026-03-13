'use client'

import { Button } from '@grab/ui'
import Link from 'next/link'

export default function AuthError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="space-y-4 text-center">
      <h2 className="text-lg font-semibold">Something went wrong</h2>
      <p className="text-sm text-muted-foreground">
        We couldn&apos;t load this page. Please try again.
      </p>
      <div className="flex flex-col gap-2">
        <Button onClick={reset}>Try again</Button>
        <Button variant="outline" asChild>
          <Link href="/">Go home</Link>
        </Button>
      </div>
    </div>
  )
}
