'use client'

import { Button } from '@grab/ui'
import { UtensilsCrossed } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { ThemeToggle } from '@/components/ui/theme-toggle'
import { useAuth } from '@/hooks/use-auth'

import { UserMenu } from './user-menu'

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/search', label: 'Restaurants' },
  { href: '/orders', label: 'Orders' },
]

export function Navbar() {
  const { user, isAuthenticated } = useAuth()
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 text-xl font-bold text-brand">
          <UtensilsCrossed className="h-6 w-6" />
          GrabFood
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-md px-3 py-2 text-sm font-medium transition-colors hover:text-foreground ${
                pathname === link.href ? 'text-foreground' : 'text-muted-foreground hover:bg-accent'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {isAuthenticated && user ? (
            <UserMenu user={user} />
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">Sign in</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/register">Get started</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
