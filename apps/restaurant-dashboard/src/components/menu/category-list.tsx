'use client'

import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core'
import {
  closestCenter,
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { MenuCategory } from '@grab/types'
import { Button } from '@grab/ui'
import { GripVertical, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'

interface CategoryListProps {
  categories: MenuCategory[]
  selectedId: string | null
  onSelect: (id: string) => void
  onAdd: () => void
  onEdit: (category: MenuCategory) => void
  onDelete: (category: MenuCategory) => void
  onReorder: (fromIndex: number, toIndex: number) => void
}

interface SortableItemProps {
  category: MenuCategory
  isSelected: boolean
  onSelect: (id: string) => void
  onEdit: (category: MenuCategory) => void
  onDelete: (category: MenuCategory) => void
}

function SortableItem({ category, isSelected, onSelect, onEdit, onDelete }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: category.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={[
        'group flex cursor-pointer items-center justify-between border-b px-4 py-3 transition-colors',
        isSelected ? 'bg-primary/10' : 'hover:bg-accent',
      ].join(' ')}
      onClick={() => onSelect(category.id)}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="mr-2 cursor-grab touch-none text-muted-foreground/40 hover:text-muted-foreground active:cursor-grabbing"
        onClick={(e) => e.stopPropagation()}
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p
            className={[
              'truncate text-sm font-medium',
              isSelected ? 'text-primary' : '',
              !category.isActive ? 'opacity-50' : '',
            ].join(' ')}
          >
            {category.name}
          </p>
          {!category.isActive && (
            <span className="shrink-0 rounded bg-muted px-1 py-0.5 text-[10px] text-muted-foreground">
              hidden
            </span>
          )}
        </div>
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
}

export function CategoryList({
  categories,
  selectedId,
  onSelect,
  onAdd,
  onEdit,
  onDelete,
  onReorder,
}: CategoryListProps) {
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const activeCategory = activeId ? categories.find((c) => c.id === activeId) : null

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string)
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveId(null)
    if (!over || active.id === over.id) return

    const fromIndex = categories.findIndex((c) => c.id === active.id)
    const toIndex = categories.findIndex((c) => c.id === over.id)
    if (fromIndex === -1 || toIndex === -1) return
    onReorder(fromIndex, toIndex)
  }

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

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={categories.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          <ul className="flex-1 overflow-y-auto">
            {categories.map((category) => (
              <SortableItem
                key={category.id}
                category={category}
                isSelected={category.id === selectedId}
                onSelect={onSelect}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </ul>
        </SortableContext>

        <DragOverlay>
          {activeCategory && (
            <div className="flex items-center gap-2 rounded-lg border bg-card px-4 py-3 opacity-90 shadow-lg">
              <GripVertical className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{activeCategory.name}</span>
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
