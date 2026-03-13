import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CartItem {
  id: string
  restaurantId: string
  restaurantName: string
  menuItemId: string
  name: string
  imageUrl: string | null
  basePrice: number
  variantId: string | null
  variantName: string | null
  variantPriceAdjustment: number
  addonIds: string[]
  addonNames: string[]
  addonTotal: number
  quantity: number
  notes: string
}

interface CartState {
  restaurantId: string | null
  restaurantName: string
  items: CartItem[]
  addItem: (item: Omit<CartItem, 'id'>) => void
  removeItem: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
  clearCart: () => void
  totalItems: () => number
  totalPrice: () => number
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      restaurantId: null,
      restaurantName: '',
      items: [],

      addItem: (item) => {
        const state = get()
        // Clear cart if switching restaurants
        if (state.restaurantId && state.restaurantId !== item.restaurantId) {
          set({
            restaurantId: item.restaurantId,
            restaurantName: item.restaurantName,
            items: [{ ...item, id: crypto.randomUUID() }],
          })
          return
        }
        set({
          restaurantId: item.restaurantId,
          restaurantName: item.restaurantName,
          items: [...state.items, { ...item, id: crypto.randomUUID() }],
        })
      },

      removeItem: (id) => {
        const items = get().items.filter((i) => i.id !== id)
        set({ items, restaurantId: items.length === 0 ? null : get().restaurantId })
      },

      updateQuantity: (id, quantity) => {
        if (quantity <= 0) {
          get().removeItem(id)
          return
        }
        set({ items: get().items.map((i) => (i.id === id ? { ...i, quantity } : i)) })
      },

      clearCart: () => set({ items: [], restaurantId: null, restaurantName: '' }),

      totalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),

      totalPrice: () =>
        get().items.reduce(
          (sum, i) => sum + (i.basePrice + i.variantPriceAdjustment + i.addonTotal) * i.quantity,
          0,
        ),
    }),
    { name: 'grab-cart' },
  ),
)
