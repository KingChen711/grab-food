import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsBoolean, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator'

export class CreateAddressDto {
  @ApiPropertyOptional({ example: 'Home' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  public label?: string

  @ApiProperty({ example: '123 Nguyen Hue, Quan 1, TP HCM' })
  @IsString()
  @MaxLength(500)
  public fullAddress: string

  @ApiPropertyOptional({ example: '123 Nguyen Hue' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  public street?: string

  @ApiPropertyOptional({ example: 'Quan 1' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  public district?: string

  @ApiPropertyOptional({ example: 'TP HCM' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  public city?: string

  @ApiPropertyOptional({ example: 'Vietnam', default: 'Vietnam' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  public country?: string

  @ApiPropertyOptional({ description: 'Latitude (will be geocoded if missing)', example: 10.7769 })
  @IsOptional()
  @IsNumber()
  public lat?: number

  @ApiPropertyOptional({
    description: 'Longitude (will be geocoded if missing)',
    example: 106.7009,
  })
  @IsOptional()
  @IsNumber()
  public lng?: number

  @ApiPropertyOptional({ example: true, default: false })
  @IsOptional()
  @IsBoolean()
  public isDefault?: boolean
}
