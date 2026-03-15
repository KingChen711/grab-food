'use client'

import type { MenuCategory, MenuItem } from '@grab/types'
import { EmptyState, Skeleton } from '@grab/ui'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { UtensilsCrossed } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import type { CategoryFormValues } from '@/components/menu/category-form'
import { CategoryForm } from '@/components/menu/category-form'
import { CategoryList } from '@/components/menu/category-list'
import type { MenuItemFormValues } from '@/components/menu/menu-item-form'
import { MenuItemForm } from '@/components/menu/menu-item-form'
import { MenuItemList } from '@/components/menu/menu-item-list'
import {
  restaurantQueryKeys,
  useMyRestaurant,
  useRestaurantCategories,
} from '@/hooks/use-restaurant'
import { restaurantApi } from '@/lib/api/restaurant.api'

export default function MenuPage() {
  const { restaurant } = useMyRestaurant()
  // Use getCategories (returns ALL categories including inactive) for management view
  const { data: categories, isLoading } = useRestaurantCategories(restaurant?.id)

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [categoryFormOpen, setCategoryFormOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null)
  const [itemFormOpen, setItemFormOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)

  const queryClient = useQueryClient()

  const invalidateCategories = () =>
    queryClient.invalidateQueries({ queryKey: restaurantQueryKeys.categories(restaurant!.id) })

  // ─── Category mutations ─────────────────────────────────────────────────────
  const createCategory = useMutation({
    mutationFn: (dto: CategoryFormValues) => restaurantApi.createCategory(restaurant!.id, dto),
    onSuccess: () => {
      void invalidateCategories()
      toast.success('Category added')
    },
    onError: () => toast.error('Failed to add category'),
  })

  const updateCategory = useMutation({
    mutationFn: (dto: CategoryFormValues) =>
      restaurantApi.updateCategory(restaurant!.id, editingCategory!.id, dto),
    onSuccess: () => {
      void invalidateCategories()
      toast.success('Category updated')
    },
    onError: () => toast.error('Failed to update category'),
  })

  const deleteCategory = useMutation({
    mutationFn: (categoryId: string) => restaurantApi.deleteCategory(restaurant!.id, categoryId),
    onSuccess: () => {
      void invalidateCategories()
      setSelectedCategoryId(null)
      toast.success('Category deleted')
    },
    onError: () => toast.error('Failed to delete category'),
  })

  // ─── Item mutations ──────────────────────────────────────────────────────────
  const createItem = useMutation({
    mutationFn: (dto: MenuItemFormValues) =>
      restaurantApi.createItem(restaurant!.id, selectedCategoryId!, dto),
    onSuccess: () => {
      void invalidateCategories()
      toast.success('Item added')
    },
    onError: () => toast.error('Failed to add item'),
  })

  const updateItem = useMutation({
    mutationFn: (dto: MenuItemFormValues) =>
      restaurantApi.updateItem(restaurant!.id, editingItem!.id, dto),
    onSuccess: () => {
      void invalidateCategories()
      toast.success('Item updated')
    },
    onError: () => toast.error('Failed to update item'),
  })

  const deleteItem = useMutation({
    mutationFn: (itemId: string) => restaurantApi.deleteItem(restaurant!.id, itemId),
    onSuccess: () => {
      void invalidateCategories()
      toast.success('Item deleted')
    },
    onError: () => toast.error('Failed to delete item'),
  })

  const toggleItemAvailability = useMutation({
    mutationFn: (item: MenuItem) =>
      restaurantApi.updateItem(restaurant!.id, item.id, {
        isAvailable: !item.isAvailable,
      }),
    onSuccess: () => void invalidateCategories(),
    onError: () => toast.error('Failed to update item'),
  })

  // ─── Sort helpers ────────────────────────────────────────────────────────────
  const handleReorderCategory = async (fromIndex: number, toIndex: number) => {
    if (!categories || !restaurant) return
    const sorted = [...categories].sort((a, b) => a.sortOrder - b.sortOrder)
    const moved = sorted[fromIndex]
    if (!moved) return

    // Compute new sortOrder using neighbors in the target position
    const reordered = [...sorted]
    reordered.splice(fromIndex, 1)
    reordered.splice(toIndex, 0, moved)

    const prev = reordered[toIndex - 1]
    const next = reordered[toIndex + 1]
    let newSortOrder: number
    if (!prev) newSortOrder = (next?.sortOrder ?? 10) - 10
    else if (!next) newSortOrder = prev.sortOrder + 10
    else newSortOrder = (prev.sortOrder + next.sortOrder) / 2

    await restaurantApi.updateCategory(restaurant.id, moved.id, { sortOrder: newSortOrder })
    void invalidateCategories()
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-96 rounded-lg" />
          <Skeleton className="col-span-2 h-96 rounded-lg" />
        </div>
      </div>
    )
  }

  if (!categories) {
    return (
      <EmptyState
        icon={<UtensilsCrossed className="h-12 w-12" />}
        title="No menu yet"
        description="Your menu will appear here once loaded."
      />
    )
  }

  const sortedCategories = [...categories].sort((a, b) => a.sortOrder - b.sortOrder)
  const selectedCategory = sortedCategories.find((c) => c.id === selectedCategoryId) ?? null

  return (
    <div className="animate-fade-in space-y-4">
      <h2 className="text-2xl font-bold">Menu Management</h2>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Left: Categories */}
        <div className="rounded-lg border bg-card shadow-sm">
          <CategoryList
            categories={sortedCategories}
            selectedId={selectedCategoryId}
            onSelect={setSelectedCategoryId}
            onAdd={() => {
              setEditingCategory(null)
              setCategoryFormOpen(true)
            }}
            onEdit={(cat) => {
              setEditingCategory(cat)
              setCategoryFormOpen(true)
            }}
            onDelete={(cat) => {
              if (confirm(`Delete category "${cat.name}"? All items will be deleted.`)) {
                deleteCategory.mutate(cat.id)
              }
            }}
            onReorder={handleReorderCategory}
          />
        </div>

        {/* Right: Items */}
        <div className="rounded-lg border bg-card shadow-sm lg:col-span-2">
          {selectedCategory ? (
            <MenuItemList
              items={selectedCategory.items}
              categoryName={selectedCategory.name}
              onAdd={() => {
                setEditingItem(null)
                setItemFormOpen(true)
              }}
              onEdit={(item) => {
                setEditingItem(item)
                setItemFormOpen(true)
              }}
              onDelete={(item) => {
                if (confirm(`Delete "${item.name}"?`)) {
                  deleteItem.mutate(item.id)
                }
              }}
              onToggleAvailability={(item) => toggleItemAvailability.mutate(item)}
            />
          ) : (
            <div className="flex h-full items-center justify-center p-12 text-center text-muted-foreground">
              <div>
                <UtensilsCrossed className="mx-auto mb-3 h-10 w-10 opacity-30" />
                <p className="text-sm">Select a category to manage its items</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Category form dialog */}
      <CategoryForm
        open={categoryFormOpen}
        onOpenChange={setCategoryFormOpen}
        title={editingCategory ? 'Edit Category' : 'Add Category'}
        initialValues={
          editingCategory
            ? {
                name: editingCategory.name,
                description: editingCategory.description ?? '',
                imageUrl: editingCategory.imageUrl ?? '',
                sortOrder: editingCategory.sortOrder,
                isActive: editingCategory.isActive,
              }
            : undefined
        }
        onSubmit={async (values) => {
          if (editingCategory) {
            await updateCategory.mutateAsync(values)
          } else {
            await createCategory.mutateAsync(values)
          }
        }}
      />

      {/* Item form dialog */}
      <MenuItemForm
        open={itemFormOpen}
        onOpenChange={setItemFormOpen}
        title={editingItem ? 'Edit Item' : 'Add Item'}
        initialValues={editingItem ?? undefined}
        onSubmit={async (values) => {
          if (editingItem) {
            await updateItem.mutateAsync(values)
          } else {
            await createItem.mutateAsync(values)
          }
        }}
      />
    </div>
  )
}
