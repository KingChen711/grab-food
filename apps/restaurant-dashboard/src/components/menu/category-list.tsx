'use client'

import type { MenuCategory } from '@grab/types'
import { Button } from '@grab/ui'
import { ChevronDown, ChevronUp, Pencil, Plus, Trash2 } from 'lucide-react'

interface CategoryListProps {
  categories: MenuCategory[]
  selectedId: string | null
  onSelect: (id: string) => void
  onAdd: () => void
  onEdit: (category: MenuCategory) => void
  onDelete: (category: MenuCategory) => void
  onMoveUp: (index: number) => void
  onMoveDown: (index: number) => void
}

export function CategoryList({
  categories,
  selectedId,
  onSelect,
  onAdd,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
}: CategoryListProps) {
  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Categories
        </h3>
        <Button size="icon-sm" variant="ghost" onClick={onAdd} aria-label="Add category">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {categories.length === 0 && (
        <p className="px-4 py-6 text-center text-sm text-muted-foreground">
          No categories yet. Add one to get started.
        </p>
      )}

      <ul className="flex-1 overflow-y-auto">
        {categories.map((category, index) => {
          const isSelected = category.id === selectedId
          return (
            <li
              key={category.id}
              className={[
                'group flex cursor-pointer items-center justify-between border-b px-4 py-3 transition-colors',
                isSelected ? 'bg-primary/10' : 'hover:bg-accent',
              ].join(' ')}
              onClick={() => onSelect(category.id)}
            >
              <div className="min-w-0 flex-1">
                <p
                  className={[
                    'truncate text-sm font-medium',
                    isSelected ? 'text-primary' : '',
                  ].join(' ')}
                >
                  {category.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {category.items.length} item{category.items.length !== 1 ? 's' : ''}
                </p>
              </div>

              <div
                className="ml-2 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100"
                onClick={(e) => e.stopPropagation()}
              >
                <Button
                  size="icon-sm"
                  variant="ghost"
                  disabled={index === 0}
                  onClick={() => onMoveUp(index)}
                  aria-label="Move up"
                >
                  <ChevronUp className="h-3 w-3" />
                </Button>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  disabled={index === categories.length - 1}
                  onClick={() => onMoveDown(index)}
                  aria-label="Move down"
                >
                  <ChevronDown className="h-3 w-3" />
                </Button>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => onEdit(category)}
                  aria-label="Edit category"
                >
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => onDelete(category)}
                  aria-label="Delete category"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
