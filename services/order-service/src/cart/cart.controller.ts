import { CurrentUser } from '@grab/nestjs-common'
import type { JwtPayload } from '@grab/types'
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger'

import { OrdersService } from '../orders/orders.service'
import { CartService } from './cart.service'
import {
  AddItemToCartDto,
  ApplyPromoCodeDto,
  CartResponse,
  CheckoutDto,
  CheckoutResponse,
  UpdateItemQuantityDto,
} from './dto/cart.dto'

@ApiTags('Cart')
@ApiBearerAuth()
@Controller('cart')
export class CartController {
  constructor(
    private readonly cartService: CartService,
    private readonly ordersService: OrdersService,
  ) {}

  // ─── Get cart ─────────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: "Get the current user's cart" })
  @ApiOkResponse({ type: CartResponse, description: 'Returns null if no cart exists' })
  public async getCart(@CurrentUser() user: JwtPayload): Promise<CartResponse | null> {
    return this.cartService.getCart(user.sub)
  }

  // ─── Items ────────────────────────────────────────────────────────────────

  @Post('items')
  @ApiOperation({
    summary: 'Add an item to cart',
    description:
      'If the item already exists (same menuItemId + variant), quantity is incremented. ' +
      'Adding an item from a different restaurant clears the existing cart first.',
  })
  @ApiOkResponse({ type: CartResponse })
  public async addItem(
    @CurrentUser() user: JwtPayload,
    @Body() dto: AddItemToCartDto,
  ): Promise<CartResponse> {
    return this.cartService.addItem(user.sub, dto)
  }

  @Patch('items/:cartItemId')
  @ApiOperation({ summary: 'Update quantity of a cart line item (quantity=0 removes the item)' })
  @ApiOkResponse({ type: CartResponse })
  public async updateItem(
    @CurrentUser() user: JwtPayload,
    @Param('cartItemId', ParseUUIDPipe) cartItemId: string,
    @Body() dto: UpdateItemQuantityDto,
  ): Promise<CartResponse> {
    return this.cartService.updateItemQuantity(user.sub, cartItemId, dto.quantity)
  }

  @Delete('items/:cartItemId')
  @ApiOperation({ summary: 'Remove a specific line item from the cart' })
  @ApiOkResponse({ type: CartResponse })
  public async removeItem(
    @CurrentUser() user: JwtPayload,
    @Param('cartItemId', ParseUUIDPipe) cartItemId: string,
  ): Promise<CartResponse> {
    return this.cartService.removeItem(user.sub, cartItemId)
  }

  // ─── Clear cart ───────────────────────────────────────────────────────────

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Clear the entire cart' })
  @ApiNoContentResponse()
  public async clearCart(@CurrentUser() user: JwtPayload): Promise<void> {
    return this.cartService.clearCart(user.sub)
  }

  // ─── Promotion code ───────────────────────────────────────────────────────

  @Post('promo')
  @ApiOperation({
    summary: 'Apply a promotion code to the cart',
    description:
      'Stores the code on the cart. Discount amount is computed at checkout by the promotion-service.',
  })
  @ApiOkResponse({ type: CartResponse })
  public async applyPromo(
    @CurrentUser() user: JwtPayload,
    @Body() dto: ApplyPromoCodeDto,
  ): Promise<CartResponse> {
    return this.cartService.applyPromoCode(user.sub, dto.code)
  }

  @Delete('promo')
  @ApiOperation({ summary: 'Remove the applied promotion code from the cart' })
  @ApiOkResponse({ type: CartResponse })
  public async removePromo(@CurrentUser() user: JwtPayload): Promise<CartResponse> {
    return this.cartService.removePromoCode(user.sub)
  }

  // ─── Reorder ──────────────────────────────────────────────────────────────

  @Post('from-order/:orderId')
  @ApiOperation({
    summary: 'Replace cart with items from a past order (reorder)',
    description:
      'Replaces the current cart contents with the items from the given order. ' +
      'The order must belong to the current user. Variants and addons are not ' +
      'preserved — only menuItem + quantity + notes — so customizations must be ' +
      're-applied on the menu page if needed.',
  })
  @ApiOkResponse({ type: CartResponse })
  public async reorder(
    @CurrentUser() user: JwtPayload,
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ): Promise<CartResponse> {
    const order = await this.ordersService.findByIdForCustomer(orderId, user.sub)
    return this.cartService.replaceFromOrder(user.sub, order)
  }

  // ─── Checkout ─────────────────────────────────────────────────────────────

  @Post('checkout')
  @ApiOperation({
    summary: 'Convert the current cart into an order and start the saga',
    description:
      'Builds an order from the cart and customer-supplied delivery address, ' +
      'kicks off the OrderFulfillment saga, then clears the cart. Returns the new order ID. ' +
      'On saga compensation, the order is later marked CANCELLED via order-service events.',
  })
  @ApiOkResponse({ type: CheckoutResponse })
  public async checkout(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CheckoutDto,
  ): Promise<CheckoutResponse> {
    const orderDto = await this.cartService.buildOrderDto(user.sub, dto)
    const { orderId } = await this.ordersService.createOrder(user.sub, orderDto)
    await this.cartService.clearCart(user.sub)
    return { orderId }
  }
}
