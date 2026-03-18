import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator'

// ─── Request DTOs ──────────────────────────────────────────────────────────────

export class SelectedVariantDto {
  @ApiProperty()
  @IsUUID()
  public id!: string

  @ApiProperty()
  @IsString()
  public name!: string

  @ApiProperty()
  @IsNumber()
  public priceAdjustment!: number
}

export class SelectedAddonDto {
  @ApiProperty()
  @IsUUID()
  public id!: string

  @ApiProperty()
  @IsString()
  public name!: string

  @ApiProperty()
  @IsNumber()
  @Min(0)
  public price!: number
}

export class AddItemToCartDto {
  @ApiProperty({ description: 'Restaurant this item belongs to' })
  @IsUUID()
  public restaurantId!: string

  @ApiProperty()
  @IsString()
  public restaurantName!: string

  @ApiProperty()
  @IsUUID()
  public menuItemId!: string

  @ApiProperty()
  @IsString()
  public menuItemName!: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  public menuItemImageUrl?: string

  @ApiProperty({ description: 'Base price of the menu item before variant/addon adjustments' })
  @IsNumber()
  @Min(0)
  public basePrice!: number

  @ApiProperty({ minimum: 1 })
  @IsNumber()
  @Min(1)
  public quantity!: number

  @ApiPropertyOptional({ type: SelectedVariantDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => SelectedVariantDto)
  public selectedVariant?: SelectedVariantDto

  @ApiPropertyOptional({ type: [SelectedAddonDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SelectedAddonDto)
  public selectedAddons?: SelectedAddonDto[]

  @ApiPropertyOptional({ description: 'Special instructions for this item' })
  @IsOptional()
  @IsString()
  public notes?: string
}

export class UpdateItemQuantityDto {
  @ApiProperty({ minimum: 0, description: 'Set to 0 to remove the item' })
  @IsNumber()
  @Min(0)
  public quantity!: number
}

export class ApplyPromoCodeDto {
  @ApiProperty()
  @IsString()
  public code!: string
}

// ─── Response types ────────────────────────────────────────────────────────────

export class CartItemResponse {
  @ApiProperty()
  public cartItemId!: string

  @ApiProperty()
  public menuItemId!: string

  @ApiProperty()
  public menuItemName!: string

  @ApiPropertyOptional()
  public menuItemImageUrl?: string

  @ApiProperty()
  public quantity!: number

  @ApiPropertyOptional()
  public selectedVariant?: SelectedVariantDto

  @ApiProperty({ type: [SelectedAddonDto] })
  public selectedAddons!: SelectedAddonDto[]

  @ApiPropertyOptional()
  public notes?: string

  @ApiProperty({ description: 'Price per unit including variant and addon prices' })
  public unitPrice!: number

  @ApiProperty({ description: 'unitPrice × quantity' })
  public totalPrice!: number
}

export class CartResponse {
  @ApiProperty()
  public id!: string

  @ApiProperty()
  public userId!: string

  @ApiProperty()
  public restaurantId!: string

  @ApiProperty()
  public restaurantName!: string

  @ApiProperty({ type: [CartItemResponse] })
  public items!: CartItemResponse[]

  @ApiProperty()
  public subtotal!: number

  @ApiProperty({ description: '0 in cart; finalized at checkout based on delivery address' })
  public deliveryFee!: number

  @ApiProperty({ description: '10% VAT on subtotal' })
  public tax!: number

  @ApiProperty({ description: '0 in cart; finalized at checkout via promotion-service' })
  public discount!: number

  @ApiProperty()
  public total!: number

  @ApiPropertyOptional()
  public appliedPromotionCode?: string

  @ApiProperty()
  public updatedAt!: string
}
