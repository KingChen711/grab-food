import { NotFoundException } from '@nestjs/common'
import { Test } from '@nestjs/testing'

import { REDIS_CLIENT } from './cart.constants'
import { CartService } from './cart.service'
import type { AddItemToCartDto } from './dto/cart.dto'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const USER_ID = '00000000-0000-0000-0000-000000000001'
const RESTAURANT_A = '00000000-0000-0000-0000-000000000002'
const RESTAURANT_B = '00000000-0000-0000-0000-000000000003'
const MENU_ITEM_ID = '00000000-0000-0000-0000-000000000010'
const MENU_ITEM_ID_2 = '00000000-0000-0000-0000-000000000011'
const VARIANT_ID = '00000000-0000-0000-0000-000000000020'

const baseItem: AddItemToCartDto = {
  restaurantId: RESTAURANT_A,
  restaurantName: 'Pizza Palace',
  menuItemId: MENU_ITEM_ID,
  menuItemName: 'Margherita Pizza',
  basePrice: 10,
  quantity: 1,
}

// ─── Redis mock ───────────────────────────────────────────────────────────────

const makeRedisMock = () => {
  const store = new Map<string, string>()
  return {
    get: jest.fn(async (key: string) => store.get(key) ?? null),
    setex: jest.fn(async (_key: string, _ttl: number, value: string) => {
      store.set(_key, value)
    }),
    del: jest.fn(async (key: string) => {
      store.delete(key)
    }),
    _store: store,
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('CartService', () => {
  let service: CartService
  let redisMock: ReturnType<typeof makeRedisMock>

  beforeEach(async () => {
    redisMock = makeRedisMock()

    const module = await Test.createTestingModule({
      providers: [CartService, { provide: REDIS_CLIENT, useValue: redisMock }],
    }).compile()

    service = module.get(CartService)
  })

  // ── getCart ──────────────────────────────────────────────────────────────

  describe('getCart', () => {
    it('returns null when cart does not exist', async () => {
      const result = await service.getCart(USER_ID)
      expect(result).toBeNull()
    })

    it('returns the cart after an item is added', async () => {
      await service.addItem(USER_ID, baseItem)
      const cart = await service.getCart(USER_ID)
      expect(cart).not.toBeNull()
      expect(cart?.items).toHaveLength(1)
    })
  })

  // ── addItem ───────────────────────────────────────────────────────────────

  describe('addItem', () => {
    it('creates a new cart when none exists', async () => {
      const cart = await service.addItem(USER_ID, baseItem)
      expect(cart.restaurantId).toBe(RESTAURANT_A)
      expect(cart.items).toHaveLength(1)
    })

    it('computes unitPrice = basePrice + variant + addons', async () => {
      const cart = await service.addItem(USER_ID, {
        ...baseItem,
        basePrice: 10,
        selectedVariant: { id: VARIANT_ID, name: 'Large', priceAdjustment: 3 },
        selectedAddons: [
          { id: '00000000-0000-0000-0000-000000000030', name: 'Extra cheese', price: 2 },
        ],
      })
      expect(cart.items[0]?.unitPrice).toBe(15) // 10 + 3 + 2
    })

    it('computes subtotal, tax, and total correctly', async () => {
      const cart = await service.addItem(USER_ID, { ...baseItem, basePrice: 20, quantity: 2 })
      expect(cart.subtotal).toBe(40)
      expect(cart.tax).toBe(4) // 10%
      expect(cart.total).toBe(44)
    })

    it('increments quantity when same item+variant is added again', async () => {
      await service.addItem(USER_ID, baseItem)
      const cart = await service.addItem(USER_ID, baseItem)
      expect(cart.items).toHaveLength(1)
      expect(cart.items[0]?.quantity).toBe(2)
    })

    it('creates separate line items for same menuItem with different variants', async () => {
      await service.addItem(USER_ID, baseItem)
      const cart = await service.addItem(USER_ID, {
        ...baseItem,
        selectedVariant: { id: VARIANT_ID, name: 'Large', priceAdjustment: 3 },
      })
      expect(cart.items).toHaveLength(2)
    })

    it('clears cart and resets promo when switching restaurant', async () => {
      await service.addItem(USER_ID, baseItem)
      await service.applyPromoCode(USER_ID, 'SAVE10')

      const cart = await service.addItem(USER_ID, {
        ...baseItem,
        restaurantId: RESTAURANT_B,
        restaurantName: 'Burger Barn',
      })

      expect(cart.restaurantId).toBe(RESTAURANT_B)
      expect(cart.items).toHaveLength(1)
      expect(cart.appliedPromotionCode).toBeUndefined()
    })

    it('does not expose _matchKey in response', async () => {
      const cart = await service.addItem(USER_ID, baseItem)
      const item = cart.items[0] as unknown as Record<string, unknown>
      expect(item['_matchKey']).toBeUndefined()
    })
  })

  // ── updateItemQuantity ────────────────────────────────────────────────────

  describe('updateItemQuantity', () => {
    it('updates quantity and recalculates total', async () => {
      const initialCart = await service.addItem(USER_ID, { ...baseItem, basePrice: 10 })
      const cartItemId = initialCart.items[0]!.cartItemId
      const cart = await service.updateItemQuantity(USER_ID, cartItemId, 3)
      expect(cart.items[0]?.quantity).toBe(3)
      expect(cart.subtotal).toBe(30)
    })

    it('removes the item when quantity is set to 0', async () => {
      const initialCart = await service.addItem(USER_ID, baseItem)
      const cartItemId = initialCart.items[0]!.cartItemId
      const cart = await service.updateItemQuantity(USER_ID, cartItemId, 0)
      expect(cart.items).toHaveLength(0)
    })

    it('throws NotFoundException for unknown cartItemId', async () => {
      await service.addItem(USER_ID, baseItem)
      await expect(
        service.updateItemQuantity(USER_ID, '00000000-0000-0000-0000-000000000099', 1),
      ).rejects.toThrow(NotFoundException)
    })

    it('throws NotFoundException when cart does not exist', async () => {
      await expect(
        service.updateItemQuantity(USER_ID, '00000000-0000-0000-0000-000000000099', 1),
      ).rejects.toThrow(NotFoundException)
    })
  })

  // ── removeItem ────────────────────────────────────────────────────────────

  describe('removeItem', () => {
    it('removes the specified line item', async () => {
      const c1 = await service.addItem(USER_ID, baseItem)
      await service.addItem(USER_ID, {
        ...baseItem,
        menuItemId: MENU_ITEM_ID_2,
        menuItemName: 'Soda',
      })
      const cartItemId = c1.items[0]!.cartItemId
      const cart = await service.removeItem(USER_ID, cartItemId)
      expect(cart.items).toHaveLength(1)
      expect(cart.items[0]?.menuItemId).toBe(MENU_ITEM_ID_2)
    })
  })

  // ── clearCart ─────────────────────────────────────────────────────────────

  describe('clearCart', () => {
    it('deletes the cart from Redis', async () => {
      await service.addItem(USER_ID, baseItem)
      await service.clearCart(USER_ID)
      const cart = await service.getCart(USER_ID)
      expect(cart).toBeNull()
    })
  })

  // ── promo code ────────────────────────────────────────────────────────────

  describe('applyPromoCode', () => {
    it('stores the promo code on the cart', async () => {
      await service.addItem(USER_ID, baseItem)
      const cart = await service.applyPromoCode(USER_ID, 'SAVE10')
      expect(cart.appliedPromotionCode).toBe('SAVE10')
    })

    it('throws NotFoundException when cart does not exist', async () => {
      await expect(service.applyPromoCode(USER_ID, 'SAVE10')).rejects.toThrow(NotFoundException)
    })
  })

  describe('removePromoCode', () => {
    it('clears the promo code from the cart', async () => {
      await service.addItem(USER_ID, baseItem)
      await service.applyPromoCode(USER_ID, 'SAVE10')
      const cart = await service.removePromoCode(USER_ID)
      expect(cart.appliedPromotionCode).toBeUndefined()
    })
  })

  // ── TTL ───────────────────────────────────────────────────────────────────

  it('persists cart with a 7-day TTL on every write', async () => {
    await service.addItem(USER_ID, baseItem)
    const expectedTtl = 7 * 24 * 60 * 60
    expect(redisMock.setex).toHaveBeenCalledWith(`cart:${USER_ID}`, expectedTtl, expect.any(String))
  })
})
