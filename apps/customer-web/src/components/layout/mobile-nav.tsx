'use client'

import { Home, ListOrdered, Search, User } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/search', label: 'Search', icon: Search },
  { href: '/orders', label: 'Orders', icon: ListOrdered },
  { href: '/profile', label: 'Profile', icon: User },
]

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="safe-bottom fixed bottom-0 left-0 right-0 z-40 border-t bg-background md:hidden">
      <div className="grid h-16 grid-cols-4">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center justify-center gap-1 text-xs transition-colors ${
                active ? 'text-brand' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className={`h-5 w-5 ${active ? 'stroke-[2.5]' : ''}`} />
              {label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
