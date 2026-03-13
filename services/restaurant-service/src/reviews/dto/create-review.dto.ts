import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsArray, IsEnum, IsOptional, IsString, IsUrl, IsUUID, MaxLength } from 'class-validator'

export class CreateReviewDto {
  @ApiProperty({ description: 'The order this review is for' })
  @IsUUID()
  public orderId: string

  @ApiProperty({ enum: [1, 2, 3, 4, 5] })
  @IsEnum([1, 2, 3, 4, 5])
  public rating: 1 | 2 | 3 | 4 | 5

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  public comment?: string

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  public images?: string[]
}

export class ReplyReviewDto {
  @ApiProperty({ maxLength: 1000 })
  @IsString()
  @MaxLength(1000)
  public reply: string
}
