'use client'

import { Skeleton } from '@grab/ui'
import { useState } from 'react'

import { HoursEditor } from '@/components/settings/hours-editor'
import { ProfileForm } from '@/components/settings/profile-form'
import { useMyRestaurant } from '@/hooks/use-restaurant'

const TABS = [
  { id: 'profile', label: 'Restaurant Profile' },
  { id: 'hours', label: 'Operating Hours' },
] as const

type TabId = (typeof TABS)[number]['id']

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('profile')
  const { restaurant, isLoading } = useMyRestaurant()

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    )
  }

  if (!restaurant) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center">
        <p className="text-muted-foreground">No restaurant found.</p>
      </div>
    )
  }

  return (
    <div className="animate-fade-in space-y-6">
      <h2 className="text-2xl font-bold">Settings</h2>

      {/* Tab navigation */}
      <div className="border-b">
        <nav className="-mb-px flex gap-6">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={[
                'border-b-2 pb-3 text-sm font-medium transition-colors',
                activeTab === id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        {activeTab === 'profile' && <ProfileForm restaurant={restaurant} />}
        {activeTab === 'hours' && <HoursEditor restaurant={restaurant} />}
      </div>
    </div>
  )
}
