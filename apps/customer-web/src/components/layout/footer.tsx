import { UtensilsCrossed } from 'lucide-react'
import Link from 'next/link'

export function Footer() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="container py-8">
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <Link href="/" className="font-bold text-brand">
            <UtensilsCrossed className="inline h-4 w-4" /> GrabFood
          </Link>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} GrabFood Clone. Built for learning purposes.
          </p>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <Link href="#" className="hover:text-foreground">
              Terms
            </Link>
            <Link href="#" className="hover:text-foreground">
              Privacy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
