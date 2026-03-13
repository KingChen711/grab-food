import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsEnum, IsOptional, IsString } from 'class-validator'

import type { UploadContext } from '../upload.types'

const UPLOAD_CONTEXTS: UploadContext[] = [
  'restaurant_cover',
  'restaurant_logo',
  'menu_item',
  'avatar',
  'delivery_proof',
]

export class RequestUploadDto {
  @ApiProperty({ enum: UPLOAD_CONTEXTS })
  @IsEnum(UPLOAD_CONTEXTS)
  public context: UploadContext

  @ApiPropertyOptional({
    example: 'uuid-of-restaurant',
    description: 'ID of the entity this image belongs to (restaurantId, itemId, userId)',
  })
  @IsOptional()
  @IsString()
  public entityId?: string
}
