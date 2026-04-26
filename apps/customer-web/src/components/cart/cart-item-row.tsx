'use client'

import { Button, formatCurrency } from '@grab/ui'
import { Minus, Plus, Trash2 } from 'lucide-react'
import Image from 'next/image'

import type { CartItem } from '@/lib/api/cart.api'

interface CartItemRowProps {
  item: CartItem
  onQuantityChange: (cartItemId: string, quantity: number) => void
  onRemove: (cartItemId: string) => void
  disabled?: boolean
}

export function CartItemRow({ item, onQuantityChange, onRemove, disabled }: CartItemRowProps) {
  return (
    <div className="flex gap-4 border-b py-4 last:border-b-0">
      {item.menuItemImageUrl ? (
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
          <Image
            src={item.menuItemImageUrl}
            alt={item.menuItemName}
            fill
            className="object-cover"
          />
        </div>
      ) : (
        <div className="h-20 w-20 shrink-0 rounded-lg bg-muted" />
      )}

      <div className="flex flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold">{item.menuItemName}</p>
            {item.selectedVariant && (
              <p className="text-xs text-muted-foreground">{item.selectedVariant.name}</p>
            )}
            {item.selectedAddons.length > 0 && (
              <p className="text-xs text-muted-foreground">
                + {item.selectedAddons.map((a) => a.name).join(', ')}
              </p>
            )}
            {item.notes && (
              <p className="mt-1 text-xs italic text-muted-foreground">{item.notes}</p>
            )}
          </div>
          <p className="whitespace-nowrap font-semibold">{formatCurrency(item.totalPrice)}</p>
        </div>

        <div className="mt-auto flex items-center justify-between">
          <div className="flex items-center gap-2 rounded-lg border px-2 py-1">
            <button
              onClick={() => onQuantityChange(item.cartItemId, item.quantity - 1)}
              disabled={disabled || item.quantity <= 1}
              aria-label="Decrease quantity"
              className="text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-6 text-center text-sm font-semibold">{item.quantity}</span>
            <button
              onClick={() => onQuantityChange(item.cartItemId, item.quantity + 1)}
              disabled={disabled}
              aria-label="Increase quantity"
              className="text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRemove(item.cartItemId)}
            disabled={disabled}
            aria-label="Remove item"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
