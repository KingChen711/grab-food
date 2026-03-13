import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator'

export class AutocompleteDto {
  @ApiProperty({ description: 'Search prefix (min 2 chars)' })
  @IsString()
  @MinLength(2)
  public q: string

  @ApiPropertyOptional({ enum: ['restaurant', 'item', 'all'], default: 'all' })
  @IsOptional()
  @IsEnum(['restaurant', 'item', 'all'])
  public type?: 'restaurant' | 'item' | 'all' = 'all'
}
