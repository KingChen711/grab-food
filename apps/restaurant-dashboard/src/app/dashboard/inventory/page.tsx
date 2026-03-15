'use client'

import type { Inventory, MenuItem } from '@grab/types'
import { Button, Input, Skeleton } from '@grab/ui'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Package, ToggleLeft, ToggleRight } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import {
  restaurantQueryKeys,
  useMyRestaurant,
  useRestaurantCategories,
  useRestaurantInventory,
} from '@/hooks/use-restaurant'
import { restaurantApi } from '@/lib/api/restaurant.api'

interface InventoryRow {
  item: MenuItem
  inventory: Inventory | null
}

export default function InventoryPage() {
  const { restaurant } = useMyRestaurant()
  const { data: categories, isLoading: loadingCategories } = useRestaurantCategories(restaurant?.id)
  const { data: inventoryList, isLoading: loadingInventory } = useRestaurantInventory(
    restaurant?.id,
  )

  const queryClient = useQueryClient()
  // Track which item's inline editor is open
  const [editing, setEditing] = useState<string | null>(null)
  const [form, setForm] = useState<{
    quantity: number
    lowStockThreshold: number
    isTracked: boolean
  }>({
    quantity: 0,
    lowStockThreshold: 5,
    isTracked: false,
  })

  const upsert = useMutation({
    mutationFn: ({
      itemId,
      dto,
    }: {
      itemId: string
      dto: { quantity: number; lowStockThreshold: number; isTracked: boolean }
    }) => restaurantApi.upsertInventory(restaurant!.id, itemId, dto),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: restaurantQueryKeys.inventory(restaurant!.id),
      })
      setEditing(null)
      toast.success('Inventory updated')
    },
    onError: () => toast.error('Failed to update inventory'),
  })

  const isLoading = loadingCategories || loadingInventory

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 rounded-lg" />
      </div>
    )
  }

  // Flatten all items across all categories
  const allItems: MenuItem[] = (categories ?? []).flatMap((c) => c.items)
  const inventoryMap = new Map<string, Inventory>(
    (inventoryList ?? []).map((inv) => [inv.itemId, inv]),
  )

  const rows: InventoryRow[] = allItems.map((item) => ({
    item,
    inventory: inventoryMap.get(item.id) ?? null,
  }))

  const openEdit = (row: InventoryRow) => {
    setEditing(row.item.id)
    setForm({
      quantity: row.inventory?.quantity ?? 0,
      lowStockThreshold: row.inventory?.lowStockThreshold ?? 5,
      isTracked: row.inventory?.isTracked ?? false,
    })
  }

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Inventory</h2>
        <p className="text-sm text-muted-foreground">{allItems.length} items</p>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border bg-card p-16 text-center">
          <Package className="mb-3 h-12 w-12 text-muted-foreground/40" />
          <p className="font-medium">No menu items yet</p>
          <p className="text-sm text-muted-foreground">Add items to your menu first.</p>
        </div>
      ) : (
        <div className="rounded-lg border bg-card shadow-sm">
          <div className="grid grid-cols-[1fr_120px_120px_80px_100px] gap-4 border-b px-4 py-3 text-xs font-medium text-muted-foreground">
            <span>Item</span>
            <span>Qty in Stock</span>
            <span>Low Stock At</span>
            <span>Tracked</span>
            <span />
          </div>

          {rows.map(({ item, inventory }) => {
            const isEditingThis = editing === item.id
            const isLow = inventory?.isTracked && inventory.quantity <= inventory.lowStockThreshold
            const isOut = inventory?.isTracked && inventory.quantity === 0

            return (
              <div
                key={item.id}
                className="grid grid-cols-[1fr_120px_120px_80px_100px] items-center gap-4 border-b px-4 py-3 last:border-0"
              >
                {/* Item name + category */}
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{item.name}</p>
                  {isOut && (
                    <span className="text-xs font-medium text-destructive">Out of stock</span>
                  )}
                  {!isOut && isLow && (
                    <span className="text-xs font-medium text-amber-500">Low stock</span>
                  )}
                </div>

                {/* Quantity */}
                {isEditingThis ? (
                  <Input
                    type="number"
                    min="0"
                    value={form.quantity}
                    onChange={(e) => setForm((f) => ({ ...f, quantity: Number(e.target.value) }))}
                    className="h-8 text-sm"
                  />
                ) : (
                  <span className="text-sm">
                    {inventory ? (
                      inventory.quantity
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </span>
                )}

                {/* Low stock threshold */}
                {isEditingThis ? (
                  <Input
                    type="number"
                    min="0"
                    value={form.lowStockThreshold}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, lowStockThreshold: Number(e.target.value) }))
                    }
                    className="h-8 text-sm"
                  />
                ) : (
                  <span className="text-sm">
                    {inventory ? (
                      inventory.lowStockThreshold
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </span>
                )}

                {/* Tracked toggle */}
                {isEditingThis ? (
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, isTracked: !f.isTracked }))}
                    className="flex items-center gap-1 text-sm"
                  >
                    {form.isTracked ? (
                      <ToggleRight className="h-5 w-5 text-primary" />
                    ) : (
                      <ToggleLeft className="h-5 w-5 text-muted-foreground" />
                    )}
                  </button>
                ) : (
                  <span className="text-sm">
                    {inventory ? (
                      inventory.isTracked ? (
                        <ToggleRight className="h-5 w-5 text-primary" />
                      ) : (
                        <ToggleLeft className="h-5 w-5 text-muted-foreground" />
                      )
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </span>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  {isEditingThis ? (
                    <>
                      <Button
                        size="sm"
                        loading={upsert.isPending}
                        onClick={() => upsert.mutate({ itemId: item.id, dto: form })}
                      >
                        Save
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                        ✕
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEdit({ item, inventory })}
                    >
                      Edit
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
