import type { CancellationReason } from '@grab/types'
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator'

export class ConfirmOrderDto {
  @IsInt()
  @Min(1)
  public estimatedPrepTimeMinutes!: number
}

export class PickUpOrderDto {
  @IsUUID()
  public driverId!: string
}

export class CancelOrderDto {
  @IsIn([
    'customer_request',
    'restaurant_declined',
    'restaurant_closed',
    'item_unavailable',
    'driver_not_found',
    'payment_failed',
    'system_error',
  ])
  public reason!: CancellationReason

  @IsIn(['customer', 'restaurant', 'system'])
  public cancelledBy!: 'customer' | 'restaurant' | 'system'

  @IsOptional()
  @IsString()
  public note?: string
}

export class RefundOrderDto {
  @IsInt()
  @Min(1)
  public amount!: number

  @IsString()
  public reason!: string
}
