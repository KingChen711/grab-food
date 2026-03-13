'use client'

import { Button } from '@grab/ui'
import Link from 'next/link'

export function NotFoundContent() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center text-center">
      <h1 className="text-8xl font-bold text-brand">404</h1>
      <h2 className="mt-4 text-2xl font-semibold">Page not found</h2>
      <p className="mt-2 text-muted-foreground">
        The page you&apos;re looking for doesn&apos;t exist.
      </p>
      <Button asChild className="mt-6">
        <Link href="/">Go home</Link>
      </Button>
    </div>
  )
}
