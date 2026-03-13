import { UtensilsCrossed } from 'lucide-react'
import Link from 'next/link'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2 text-2xl font-bold text-brand">
            <UtensilsCrossed className="h-6 w-6" /> GrabFood
          </Link>
        </div>
        <div className="rounded-2xl border bg-background p-6 shadow-md">{children}</div>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          <Link href="/" className="hover:underline">
            ← Back to home
          </Link>
        </p>
      </div>
    </div>
  )
}
