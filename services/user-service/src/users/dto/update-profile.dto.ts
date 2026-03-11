import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsDateString, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator'

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Nguyen Van A' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  public fullName?: string

  @ApiPropertyOptional({ example: 'https://example.com/avatar.jpg' })
  @IsOptional()
  @IsUrl()
  public avatarUrl?: string

  @ApiPropertyOptional({ example: '1990-01-01' })
  @IsOptional()
  @IsDateString()
  public dateOfBirth?: string

  @ApiPropertyOptional({ example: 'I love pizza!' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  public bio?: string
}
