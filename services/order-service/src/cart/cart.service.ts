import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import { randomUUID } from 'crypto'
import type { Redis } from 'ioredis'

import { REDIS_CLIENT } from './cart.constants'
import type {
  AddItemToCartDto,
  CartResponse,
  SelectedAddonDto,
  SelectedVariantDto,
} from './dto/cart.dto'

// ─── Internal stored types (Redis) ────────────────────────────────────────────

interface StoredCartItem {
  cartItemId: string
  /** Dedup key: `{menuItemId}:{variantId|none}` */
  _matchKey: string
  menuItemId: string
  menuItemName: string
  menuItemImageUrl?: string
  quantity: number
  selectedVariant?: SelectedVariantDto
  selectedAddons: SelectedAddonDto[]
  notes?: string
  unitPrice: number
  totalPrice: number
}

interface StoredCart {
  id: string
  userId: string
  restaurantId: string
  restaurantName: string
  items: StoredCartItem[]
  subtotal: number
  deliveryFee: number
  tax: number
  discount: number
  total: number
  appliedPromotionCode?: string
  updatedAt: string
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class CartService {
  /** 7 days in seconds — reset on every write */
  private readonly CART_TTL = 7 * 24 * 60 * 60

  /** 10% VAT placeholder — real tax engine in Phase 7 */
  private readonly TAX_RATE = 0.1

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  // ─── Queries ──────────────────────────────────────────────────────────────

  public async getCart(userId: string): Promise<CartResponse | null> {
    const raw = await this.redis.get(this.key(userId))
    if (!raw) return null
    return this.toResponse(JSON.parse(raw) as StoredCart)
  }

  // ─── Commands ─────────────────────────────────────────────────────────────

  /**
   * Add an item to the cart.
   * - If the cart belongs to a different restaurant, it is cleared first.
   * - If an identical item (same menuItemId + variant) already exists, its
   *   quantity is incremented instead of creating a duplicate line item.
   */
  public async addItem(userId: string, dto: AddItemToCartDto): Promise<CartResponse> {
    let cart = await this.loadCart(userId)

    if (!cart) {
      cart = this.createEmptyCart(userId, dto.restaurantId, dto.restaurantName)
    } else if (cart.restaurantId !== dto.restaurantId) {
      // Different restaurant — start fresh, clear previous promo too
      cart.restaurantId = dto.restaurantId
      cart.restaurantName = dto.restaurantName
      cart.items = []
      cart.appliedPromotionCode = undefined
    }

    const unitPrice = this.computeUnitPrice(dto)
    const matchKey = `${dto.menuItemId}:${dto.selectedVariant?.id ?? 'none'}`
    const existing = cart.items.find((i) => i._matchKey === matchKey)

    if (existing) {
      existing.quantity += dto.quantity
      existing.totalPrice = existing.unitPrice * existing.quantity
    } else {
      cart.items.push({
        cartItemId: randomUUID(),
        _matchKey: matchKey,
        menuItemId: dto.menuItemId,
        menuItemName: dto.menuItemName,
        menuItemImageUrl: dto.menuItemImageUrl,
        quantity: dto.quantity,
        selectedVariant: dto.selectedVariant,
        selectedAddons: dto.selectedAddons ?? [],
        notes: dto.notes,
        unitPrice,
        totalPrice: unitPrice * dto.quantity,
      })
    }

    return this.recalcAndSave(userId, cart)
  }

  /**
   * Update the quantity of a specific cart line item.
   * Pass quantity = 0 to remove the item entirely.
   */
  public async updateItemQuantity(
    userId: string,
    cartItemId: string,
    quantity: number,
  ): Promise<CartResponse> {
    const cart = await this.loadOrFail(userId)

    if (quantity === 0) {
      cart.items = cart.items.filter((i) => i.cartItemId !== cartItemId)
    } else {
      const item = cart.items.find((i) => i.cartItemId === cartItemId)
      if (!item) throw new NotFoundException(`Cart item ${cartItemId} not found`)
      item.quantity = quantity
      item.totalPrice = item.unitPrice * quantity
    }

    return this.recalcAndSave(userId, cart)
  }

  /** Remove a single line item from the cart. */
  public async removeItem(userId: string, cartItemId: string): Promise<CartResponse> {
    return this.updateItemQuantity(userId, cartItemId, 0)
  }

  /** Delete the entire cart from Redis. */
  public async clearCart(userId: string): Promise<void> {
    await this.redis.del(this.key(userId))
  }

  /**
   * Store a promotion code on the cart.
   * Actual discount amount is computed at checkout by the promotion-service.
   */
  public async applyPromoCode(userId: string, code: string): Promise<CartResponse> {
    const cart = await this.loadOrFail(userId)
    cart.appliedPromotionCode = code
    return this.recalcAndSave(userId, cart)
  }

  /** Remove any applied promotion code from the cart. */
  public async removePromoCode(userId: string): Promise<CartResponse> {
    const cart = await this.loadOrFail(userId)
    cart.appliedPromotionCode = undefined
    return this.recalcAndSave(userId, cart)
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private key(userId: string): string {
    return `cart:${userId}`
  }

  private createEmptyCart(
    userId: string,
    restaurantId: string,
    restaurantName: string,
  ): StoredCart {
    return {
      id: userId,
      userId,
      restaurantId,
      restaurantName,
      items: [],
      subtotal: 0,
      deliveryFee: 0,
      tax: 0,
      discount: 0,
      total: 0,
      updatedAt: new Date().toISOString(),
    }
  }

  private computeUnitPrice(dto: AddItemToCartDto): number {
    const variantAdjustment = dto.selectedVariant?.priceAdjustment ?? 0
    const addonsTotal = (dto.selectedAddons ?? []).reduce((sum, a) => sum + a.price, 0)
    return dto.basePrice + variantAdjustment + addonsTotal
  }

  private async loadCart(userId: string): Promise<StoredCart | null> {
    const raw = await this.redis.get(this.key(userId))
    if (!raw) return null
    return JSON.parse(raw) as StoredCart
  }

  private async loadOrFail(userId: string): Promise<StoredCart> {
    const cart = await this.loadCart(userId)
    if (!cart) throw new NotFoundException('Cart not found or has expired')
    return cart
  }

  private async recalcAndSave(userId: string, cart: StoredCart): Promise<CartResponse> {
    cart.subtotal = cart.items.reduce((sum, i) => sum + i.totalPrice, 0)
    cart.deliveryFee = 0 // finalized at checkout when delivery address is set
    cart.tax = this.round(cart.subtotal * this.TAX_RATE)
    cart.discount = 0 // finalized at checkout via promotion-service
    cart.total = cart.subtotal + cart.deliveryFee + cart.tax - cart.discount
    cart.updatedAt = new Date().toISOString()

    await this.redis.setex(this.key(userId), this.CART_TTL, JSON.stringify(cart))
    return this.toResponse(cart)
  }

  /** Strip internal `_matchKey` from stored items before returning to client. */
  private toResponse(cart: StoredCart): CartResponse {
    return {
      ...cart,
      items: cart.items.map(({ _matchKey: _, ...item }) => item),
    }
  }

  private round(value: number): number {
    return Math.round(value * 100) / 100
  }
}
