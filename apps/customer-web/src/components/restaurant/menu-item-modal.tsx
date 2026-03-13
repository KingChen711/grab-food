'use client'

import { Button } from '@grab/ui'
import * as Dialog from '@radix-ui/react-dialog'
import { Minus, Plus, X } from 'lucide-react'
import Image from 'next/image'
import { useState } from 'react'
import { toast } from 'sonner'

import type { MenuItem, MenuItemAddon, MenuItemVariant, Restaurant } from '@/lib/api/restaurant.api'
import { useCartStore } from '@/stores/cart.store'

interface MenuItemModalProps {
  item: MenuItem
  restaurant: Restaurant
  open: boolean
  onClose: () => void
}

export function MenuItemModal({ item, restaurant, open, onClose }: MenuItemModalProps) {
  const addItem = useCartStore((s) => s.addItem)
  const cartRestaurantId = useCartStore((s) => s.restaurantId)

  const defaultVariant = item.variants.find((v) => v.isDefault) ?? item.variants[0] ?? null
  const [selectedVariant, setSelectedVariant] = useState<MenuItemVariant | null>(defaultVariant)
  const [selectedAddons, setSelectedAddons] = useState<MenuItemAddon[]>([])
  const [quantity, setQuantity] = useState(1)
  const [notes, setNotes] = useState('')

  const variantPrice = selectedVariant?.priceAdjustment ?? 0
  const addonTotal = selectedAddons.reduce((sum, a) => sum + a.price, 0)
  const unitPrice = Number(item.basePrice) + variantPrice + addonTotal
  const totalPrice = unitPrice * quantity

  function toggleAddon(addon: MenuItemAddon) {
    setSelectedAddons((prev) =>
      prev.find((a) => a.id === addon.id)
        ? prev.filter((a) => a.id !== addon.id)
        : [...prev, addon],
    )
  }

  function handleAddToCart() {
    if (cartRestaurantId && cartRestaurantId !== restaurant.id) {
      if (
        !window.confirm(
          'Your cart has items from another restaurant. Starting a new cart will clear your current items. Continue?',
        )
      ) {
        return
      }
    }

    addItem({
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
      menuItemId: item.id,
      name: item.name,
      imageUrl: item.imageUrl,
      basePrice: Number(item.basePrice),
      variantId: selectedVariant?.id ?? null,
      variantName: selectedVariant?.name ?? null,
      variantPriceAdjustment: selectedVariant?.priceAdjustment ?? 0,
      addonIds: selectedAddons.map((a) => a.id),
      addonNames: selectedAddons.map((a) => a.name),
      addonTotal,
      quantity,
      notes,
    })

    toast.success(`${item.name} added to cart`)
    onClose()
  }

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 max-h-[90vh] w-full max-w-lg translate-x-[-50%] translate-y-[-50%] overflow-y-auto rounded-2xl bg-background shadow-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          {/* Image */}
          {item.imageUrl && (
            <div className="relative h-52 w-full overflow-hidden rounded-t-2xl bg-muted">
              <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />
            </div>
          )}

          <div className="p-5">
            {/* Close */}
            <Dialog.Close className="absolute right-4 top-4 rounded-full bg-background/80 p-1.5 shadow">
              <X className="h-4 w-4" />
            </Dialog.Close>

            {/* Title */}
            <Dialog.Title className="text-xl font-bold">{item.name}</Dialog.Title>
            {item.description && (
              <Dialog.Description className="mt-1 text-sm text-muted-foreground">
                {item.description}
              </Dialog.Description>
            )}

            {/* Dietary badges */}
            {(item.isVegetarian || item.isVegan || item.isGlutenFree || item.isHalal) && (
              <div className="mt-2 flex flex-wrap gap-1">
                {item.isVegan && (
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    Vegan
                  </span>
                )}
                {item.isVegetarian && !item.isVegan && (
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    Vegetarian
                  </span>
                )}
                {item.isGlutenFree && (
                  <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                    Gluten-free
                  </span>
                )}
                {item.isHalal && (
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                    Halal
                  </span>
                )}
                {item.isSpicy && (
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700 dark:bg-red-900/30 dark:text-red-400">
                    {'🌶️'.repeat(item.spicyLevel ?? 1)} Spicy
                  </span>
                )}
              </div>
            )}

            {/* Variants */}
            {item.variants.length > 0 && (
              <div className="mt-5">
                <p className="mb-2 font-semibold">
                  Size / Option{' '}
                  <span className="text-xs font-normal text-muted-foreground">(required)</span>
                </p>
                <div className="space-y-2">
                  {item.variants.map((v) => (
                    <label
                      key={v.id}
                      className="flex cursor-pointer items-center justify-between rounded-lg border p-3 transition-colors hover:border-brand"
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="variant"
                          checked={selectedVariant?.id === v.id}
                          onChange={() => setSelectedVariant(v)}
                          className="accent-brand"
                        />
                        <span>{v.name}</span>
                      </div>
                      {v.priceAdjustment !== 0 && (
                        <span className="text-sm text-muted-foreground">
                          {v.priceAdjustment > 0 ? '+' : ''}${v.priceAdjustment.toFixed(2)}
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Addons */}
            {item.addons.length > 0 && (
              <div className="mt-5">
                <p className="mb-2 font-semibold">
                  Add-ons{' '}
                  <span className="text-xs font-normal text-muted-foreground">(optional)</span>
                </p>
                <div className="space-y-2">
                  {item.addons.map((a) => (
                    <label
                      key={a.id}
                      className="flex cursor-pointer items-center justify-between rounded-lg border p-3 transition-colors hover:border-brand"
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedAddons.some((s) => s.id === a.id)}
                          onChange={() => toggleAddon(a)}
                          className="h-4 w-4 rounded accent-brand"
                        />
                        <span>{a.name}</span>
                      </div>
                      {a.price > 0 && (
                        <span className="text-sm text-muted-foreground">
                          +${a.price.toFixed(2)}
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="mt-5">
              <p className="mb-2 text-sm font-semibold">Special instructions</p>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="No onions, extra sauce..."
                rows={2}
                className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {/* Quantity + Add to cart */}
            <div className="mt-5 flex items-center gap-4">
              <div className="flex items-center gap-3 rounded-xl border px-3 py-2">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-5 text-center font-semibold">{quantity}</span>
                <button
                  onClick={() => setQuantity((q) => q + 1)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              <Button
                onClick={handleAddToCart}
                variant="brand"
                className="flex-1"
                disabled={!item.isAvailable}
              >
                {item.isAvailable
                  ? `Add to cart · $${totalPrice.toFixed(2)}`
                  : 'Currently unavailable'}
              </Button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
