'use client'

import { Button } from '@grab/ui'
import Link from 'next/link'

export function HomeCTAs() {
  return (
    <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
      <Button size="lg" asChild>
        <Link href="/search">Find restaurants</Link>
      </Button>
      <Button size="lg" variant="outline" asChild>
        <Link href="/register">Create account</Link>
      </Button>
    </div>
  )
}
