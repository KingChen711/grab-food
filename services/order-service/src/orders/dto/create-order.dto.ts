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

export class DeliveryAddressDto {
  @IsOptional()
  @IsString()
  public label?: string

  @IsString()
  public address!: string

  @IsNumber()
  public lat!: number

  @IsNumber()
  public lng!: number

  @IsOptional()
  @IsString()
  public notes?: string
}

export class OrderItemDto {
  @IsUUID()
  public menuItemId!: string

  @IsString()
  public menuItemName!: string

  @IsNumber()
  @Min(0)
  public unitPrice!: number

  @IsNumber()
  @Min(1)
  public quantity!: number

  @IsOptional()
  @IsString()
  public notes?: string
}

export class CreateOrderDto {
  @IsUUID()
  public restaurantId!: string

  @IsString()
  public restaurantName!: string

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  public items!: OrderItemDto[]

  @IsNumber()
  @Min(0)
  public subtotal!: number

  @IsNumber()
  @Min(0)
  public deliveryFee!: number

  @IsNumber()
  @Min(0)
  public tax!: number

  @IsNumber()
  @Min(0)
  public total!: number

  @ValidateNested()
  @Type(() => DeliveryAddressDto)
  public deliveryAddress!: DeliveryAddressDto

  @IsOptional()
  @IsString()
  public notes?: string

  @IsOptional()
  public scheduledFor?: Date
}
