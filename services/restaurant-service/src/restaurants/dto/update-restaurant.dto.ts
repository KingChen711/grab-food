import { ApiPropertyOptional, PartialType } from '@nestjs/swagger'
import { IsBoolean, IsOptional } from 'class-validator'

import { CreateRestaurantDto } from './create-restaurant.dto'

export class UpdateRestaurantDto extends PartialType(CreateRestaurantDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  public isOpen?: boolean
}
