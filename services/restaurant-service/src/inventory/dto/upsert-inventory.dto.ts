import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator'

export class UpsertInventoryDto {
  @ApiProperty({ example: 100 })
  @IsInt()
  @Min(0)
  public quantity: number

  @ApiPropertyOptional({
    example: 5,
    description: 'Emit low_stock event when quantity falls to or below this',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  public lowStockThreshold?: number

  @ApiPropertyOptional({
    description: 'Enable stock tracking — decrement on order, emit events on low/out',
  })
  @IsOptional()
  @IsBoolean()
  public isTracked?: boolean
}
