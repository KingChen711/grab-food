import { ApiPropertyOptional } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator'

export class SearchRestaurantsDto {
  @ApiPropertyOptional({ description: 'Full-text search query' })
  @IsOptional()
  @IsString()
  public q?: string

  @ApiPropertyOptional({ description: 'Latitude for geo search' })
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseFloat(value))
  public lat?: number

  @ApiPropertyOptional({ description: 'Longitude for geo search' })
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseFloat(value))
  public lng?: number

  @ApiPropertyOptional({ description: 'Search radius in km', default: 10 })
  @IsOptional()
  @IsNumber()
  @Min(0.5)
  @Max(50)
  @Transform(({ value }) => parseFloat(value))
  public radius?: number = 10

  @ApiPropertyOptional({ description: 'Filter by cuisine types', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  public cuisine?: string[]

  @ApiPropertyOptional({ description: 'Filter by price range (1-4)' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(4)
  @Transform(({ value }) => parseInt(value))
  public priceRange?: number

  @ApiPropertyOptional({ description: 'Minimum average rating (0-5)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  @Transform(({ value }) => parseFloat(value))
  public minRating?: number

  @ApiPropertyOptional({ description: 'Max average prep time in minutes' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Transform(({ value }) => parseInt(value))
  public maxPrepTime?: number

  @ApiPropertyOptional({ description: 'Filter to only open restaurants' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  public isOpen?: boolean

  @ApiPropertyOptional({ enum: ['relevance', 'distance', 'rating', 'popularity'] })
  @IsOptional()
  @IsEnum(['relevance', 'distance', 'rating', 'popularity'])
  public sort?: 'relevance' | 'distance' | 'rating' | 'popularity' = 'relevance'

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Transform(({ value }) => parseInt(value))
  public page?: number = 1

  @ApiPropertyOptional({ default: 20, maximum: 50 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  @Transform(({ value }) => parseInt(value))
  public limit?: number = 20
}
