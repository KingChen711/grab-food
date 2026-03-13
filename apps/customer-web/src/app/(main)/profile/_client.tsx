'use client'

import { Button } from '@grab/ui'
import { MapPin } from 'lucide-react'
import Link from 'next/link'

import { ProfileForm } from '@/components/profile/profile-form'
import { ProfileSkeleton } from '@/components/profile/profile-skeleton'
import { useMe } from '@/hooks/use-auth-query'

export function ProfilePageClient() {
  const { data: user, isLoading } = useMe()

  if (isLoading) return <ProfileSkeleton />

  if (!user) {
    return (
      <div className="container max-w-2xl py-8 text-center">
        <p className="text-muted-foreground">Could not load profile.</p>
      </div>
    )
  }

  return (
    <div className="container max-w-2xl py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Profile</h1>
        <Button variant="outline" size="sm" asChild>
          <Link href="/profile/addresses">
            <MapPin className="mr-2 h-4 w-4" />
            Addresses
          </Link>
        </Button>
      </div>

      <div className="rounded-2xl border bg-card p-6">
        <ProfileForm user={user} />
      </div>
    </div>
  )
}
