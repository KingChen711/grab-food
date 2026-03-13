'use client'

import type { User } from '@grab/types'
import { UserAvatar } from '@grab/ui'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { ChevronDown, LogOut, MapPin, User as UserIcon } from 'lucide-react'
import Link from 'next/link'

import { useLogout } from '@/hooks/use-auth-query'

interface UserMenuProps {
  user: User
}

export function UserMenu({ user }: UserMenuProps) {
  const logout = useLogout()

  console.log({ user })

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          aria-label="User menu"
          className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <UserAvatar
            name={user.profile?.fullName ?? user.email ?? user.phone ?? '—'}
            imageUrl={user.profile?.avatarUrl}
            size="sm"
          />
          <span className="hidden md:block">
            {user.profile?.fullName ?? user.email ?? user.phone ?? '—'}
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 min-w-[180px] animate-fade-in rounded-lg border bg-popover p-1 shadow-floating"
        >
          <div className="px-3 py-2">
            <p className="text-sm font-medium">
              {user.profile?.fullName ?? user.email ?? user.phone ?? '—'}
            </p>
            <p className="truncate text-xs text-muted-foreground">{user.email ?? user.phone}</p>
          </div>

          <DropdownMenu.Separator className="my-1 h-px bg-border" />

          <DropdownMenu.Item asChild>
            <Link
              href="/profile"
              className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent focus:outline-none"
            >
              <UserIcon className="h-4 w-4" />
              Profile
            </Link>
          </DropdownMenu.Item>

          <DropdownMenu.Item asChild>
            <Link
              href="/profile/addresses"
              className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent focus:outline-none"
            >
              <MapPin className="h-4 w-4" />
              Addresses
            </Link>
          </DropdownMenu.Item>

          <DropdownMenu.Separator className="my-1 h-px bg-border" />

          <DropdownMenu.Item asChild>
            <button
              onClick={() => logout.mutate()}
              disabled={logout.isPending}
              className="flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-destructive hover:bg-destructive/10 focus:outline-none disabled:opacity-50"
            >
              <LogOut className="h-4 w-4" />
              {logout.isPending ? 'Signing out...' : 'Sign out'}
            </button>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
