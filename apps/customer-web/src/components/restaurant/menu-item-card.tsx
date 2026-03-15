'use client'

import { Badge } from '@grab/ui'
import { Flame, Plus, Utensils } from 'lucide-react'
import Image from 'next/image'
import { useState } from 'react'

import type { MenuItem, Restaurant } from '@/lib/api/restaurant.api'

import { MenuItemModal } from './menu-item-modal'

interface MenuItemCardProps {
  item: MenuItem
  restaurant: Restaurant
}

export function MenuItemCard({ item, restaurant }: MenuItemCardProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        disabled={!item.isAvailable}
        className="group flex w-full items-start gap-4 rounded-xl border bg-card p-4 text-left transition-shadow hover:shadow-md disabled:opacity-60"
      >
        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-semibold leading-snug">{item.name}</p>
            {!item.isAvailable && (
              <Badge variant="secondary" className="text-xs">
                Unavailable
              </Badge>
            )}
          </div>
          {item.description && (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.description}</p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="font-semibold text-brand">${Number(item.basePrice).toFixed(2)}</span>
            {item.calories && (
              <span className="text-xs text-muted-foreground">{item.calories} cal</span>
            )}
            {item.isSpicy && (
              <span className="flex items-center gap-0.5 rounded-full bg-red-100 px-1.5 py-0.5 text-xs text-red-700 dark:bg-red-900/30 dark:text-red-400">
                <Flame className="h-3 w-3" aria-hidden="true" />
                Spicy
              </span>
            )}
            {item.isVegan && (
              <span className="rounded-full bg-green-100 px-1.5 py-0.5 text-xs text-green-700 dark:bg-green-900/30 dark:text-green-400">
                Vegan
              </span>
            )}
            {item.isHalal && (
              <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-xs text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                Halal
              </span>
            )}
          </div>
        </div>

        {/* Image + add button */}
        <div className="relative shrink-0">
          <div className="relative h-24 w-24 overflow-hidden rounded-xl bg-muted">
            {item.imageUrl ? (
              <Image
                src={item.imageUrl}
                alt={item.name}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                sizes="96px"
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <Utensils className="h-8 w-8 text-muted-foreground/30" aria-hidden="true" />
              </div>
            )}
          </div>
          {item.isAvailable && (
            <div className="absolute -bottom-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-brand text-brand-foreground shadow-md">
              <Plus className="h-4 w-4" />
            </div>
          )}
        </div>
      </button>

      {open && (
        <MenuItemModal
          item={item}
          restaurant={restaurant}
          open={open}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
