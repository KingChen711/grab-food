'use client'

import type { MenuItem } from '@grab/types'
import { Button } from '@grab/ui'
import { Pencil, Plus, Trash2, UtensilsCrossed } from 'lucide-react'
import Image from 'next/image'

interface MenuItemListProps {
  items: MenuItem[]
  categoryName: string
  onAdd: () => void
  onEdit: (item: MenuItem) => void
  onDelete: (item: MenuItem) => void
  onToggleAvailability: (item: MenuItem) => void
}

export function MenuItemList({
  items,
  categoryName,
  onAdd,
  onEdit,
  onDelete,
  onToggleAvailability,
}: MenuItemListProps) {
  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {categoryName}
        </h3>
        <Button size="sm" onClick={onAdd}>
          <Plus className="h-4 w-4" />
          Add Item
        </Button>
      </div>

      {items.length === 0 && (
        <p className="px-4 py-8 text-center text-sm text-muted-foreground">
          No items in this category. Add one to get started.
        </p>
      )}

      <ul className="flex-1 divide-y overflow-y-auto">
        {items.map((item) => (
          <li key={item.id} className="group flex items-center gap-4 px-4 py-3">
            {/* Image placeholder */}
            <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-md bg-muted">
              {item.imageUrl ? (
                <Image
                  src={item.imageUrl}
                  alt={item.name}
                  fill
                  className="object-cover"
                  sizes="56px"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <UtensilsCrossed
                    className="h-6 w-6 text-muted-foreground/30"
                    aria-hidden="true"
                  />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{item.name}</p>
              {item.description && (
                <p className="truncate text-xs text-muted-foreground">{item.description}</p>
              )}
              <p className="text-sm font-semibold text-primary">${item.basePrice.toFixed(2)}</p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {/* Availability toggle */}
              <button
                className={[
                  'relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  item.isAvailable ? 'bg-primary' : 'bg-muted-foreground/30',
                ].join(' ')}
                onClick={() => onToggleAvailability(item)}
                aria-label={item.isAvailable ? 'Mark unavailable' : 'Mark available'}
              >
                <span
                  className={[
                    'inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform',
                    item.isAvailable ? 'translate-x-5' : 'translate-x-1',
                  ].join(' ')}
                />
              </button>

              <Button
                size="icon-sm"
                variant="ghost"
                onClick={() => onEdit(item)}
                aria-label="Edit item"
              >
                <Pencil className="h-3 w-3" />
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => onDelete(item)}
                aria-label="Delete item"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
