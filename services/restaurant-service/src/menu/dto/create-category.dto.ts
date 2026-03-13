import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsBoolean, IsInt, IsOptional, IsString, IsUrl, MaxLength, Min } from 'class-validator'

export class CreateCategoryDto {
  @ApiProperty({ example: 'Appetizers' })
  @IsString()
  @MaxLength(100)
  public name: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  public description?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  public imageUrl?: string

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  public sortOrder?: number

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  public isActive?: boolean
}
