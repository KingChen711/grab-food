'use client'

import { EmptyState, Skeleton } from '@grab/ui'
import { UtensilsCrossed } from 'lucide-react'
import { useState } from 'react'

import type { MenuCategory, Restaurant } from '@/lib/api/restaurant.api'

import { MenuItemCard } from './menu-item-card'

interface MenuTabsProps {
  restaurant: Restaurant
  menu: MenuCategory[]
  isLoading: boolean
}

export function MenuTabs({ restaurant, menu, isLoading }: MenuTabsProps) {
  const [activeTab, setActiveTab] = useState(0)

  if (isLoading) {
    return (
      <div className="mb-8">
        <div className="mb-4 flex gap-3 overflow-x-auto pb-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-24 shrink-0 rounded-full" />
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  const activeCategories = menu.filter((cat) => cat.items.length > 0)

  if (activeCategories.length === 0) {
    return (
      <EmptyState
        icon={<UtensilsCrossed className="h-8 w-8" />}
        title="Menu not available"
        description="This restaurant hasn't added menu items yet."
      />
    )
  }

  const activeCategory = activeCategories[activeTab] ?? activeCategories[0]

  return (
    <div className="mb-10">
      {/* Category tabs */}
      <div className="scrollbar-none mb-5 flex gap-2 overflow-x-auto pb-1">
        {activeCategories.map((cat, i) => (
          <button
            key={cat.id}
            onClick={() => setActiveTab(i)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === i
                ? 'bg-brand text-brand-foreground'
                : 'border bg-card text-muted-foreground hover:border-brand hover:text-brand'
            }`}
          >
            {cat.name}
            <span className="ml-1.5 text-xs opacity-70">({cat.items.length})</span>
          </button>
        ))}
      </div>

      {/* Category description */}
      {activeCategory?.description && (
        <p className="mb-4 text-sm text-muted-foreground">{activeCategory.description}</p>
      )}

      {/* Items grid */}
      {activeCategory && (
        <div className="grid gap-3 sm:grid-cols-2">
          {activeCategory.items.map((item) => (
            <MenuItemCard key={item.id} item={item} restaurant={restaurant} />
          ))}
        </div>
      )}
    </div>
  )
}
