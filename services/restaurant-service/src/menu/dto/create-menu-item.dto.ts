import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator'

export class CreateVariantDto {
  @ApiProperty({ example: 'Large' })
  @IsString()
  @MaxLength(100)
  public name: string

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  public priceAdjustment?: number

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  public isDefault?: boolean
}

export class CreateAddonDto {
  @ApiProperty({ example: 'Extra sauce' })
  @IsString()
  @MaxLength(100)
  public name: string

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  public price?: number

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  public maxQuantity?: number

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  public isRequired?: boolean
}

export class CreateMenuItemDto {
  @ApiProperty({ example: 'Phở bò tái' })
  @IsString()
  @MaxLength(200)
  public name: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  public description?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  public imageUrl?: string

  @ApiProperty({ example: 75000 })
  @IsNumber()
  @Min(0)
  public basePrice: number

  @ApiPropertyOptional({ default: 'VND' })
  @IsOptional()
  @IsString()
  public currency?: string

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  public isAvailable?: boolean

  @ApiPropertyOptional({ default: 15 })
  @IsOptional()
  @IsInt()
  @Min(1)
  public prepTimeMinutes?: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  public calories?: number

  @ApiPropertyOptional({ example: ['spicy', 'popular'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  public tags?: string[]

  // ─── Dietary ─────────────────────────────────────────────────────────

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  public isVegetarian?: boolean

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  public isVegan?: boolean

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  public isGlutenFree?: boolean

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  public isHalal?: boolean

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  public isSpicy?: boolean

  @ApiPropertyOptional({ enum: [1, 2, 3] })
  @IsOptional()
  @IsEnum([1, 2, 3])
  public spicyLevel?: 1 | 2 | 3

  // ─── Variants & Addons ───────────────────────────────────────────────

  @ApiPropertyOptional({ type: [CreateVariantDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateVariantDto)
  public variants?: CreateVariantDto[]

  @ApiPropertyOptional({ type: [CreateAddonDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateAddonDto)
  public addons?: CreateAddonDto[]
}
