import type { PriceRange } from '@grab/types'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPhoneNumber,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator'

import { OperatingHoursDto } from './operating-hours.dto'

export class CreateRestaurantDto {
  @ApiProperty({ example: 'Pho 24' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  public name: string

  @ApiPropertyOptional({ example: 'Famous Vietnamese Pho restaurant' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  public description?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  public coverImageUrl?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  public logoUrl?: string

  @ApiProperty({ example: '24 Lý Thường Kiệt, Hà Nội' })
  @IsString()
  @IsNotEmpty()
  public fullAddress: string

  @ApiProperty({ example: 'Hà Nội' })
  @IsString()
  @IsNotEmpty()
  public city: string

  @ApiProperty({ example: 'Vietnam' })
  @IsString()
  @IsNotEmpty()
  public country: string

  @ApiProperty({ example: 21.0285 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  public lat: number

  @ApiProperty({ example: 105.8542 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  public lng: number

  @ApiProperty({ example: '+84901234567' })
  @IsPhoneNumber()
  public phone: string

  @ApiProperty({ example: ['Vietnamese', 'Noodles'] })
  @IsArray()
  @IsString({ each: true })
  public cuisineTypes: string[]

  @ApiProperty({ enum: [1, 2, 3, 4], example: 2 })
  @IsEnum([1, 2, 3, 4])
  public priceRange: PriceRange

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  public minOrderAmount?: number

  @ApiPropertyOptional({ example: 15000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  public deliveryFee?: number

  @ApiPropertyOptional({ type: [OperatingHoursDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OperatingHoursDto)
  public operatingHours?: OperatingHoursDto[]
}
