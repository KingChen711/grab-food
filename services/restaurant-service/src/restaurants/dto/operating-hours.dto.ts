import type { DayOfWeek } from '@grab/types'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsBoolean, IsEnum, IsOptional, Matches } from 'class-validator'

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/

export class OperatingHoursDto {
  @ApiProperty({ enum: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] })
  @IsEnum(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'])
  public dayOfWeek: DayOfWeek

  @ApiPropertyOptional({ example: '09:00' })
  @IsOptional()
  @Matches(TIME_REGEX, { message: 'openTime must be HH:mm' })
  public openTime?: string

  @ApiPropertyOptional({ example: '22:00' })
  @IsOptional()
  @Matches(TIME_REGEX, { message: 'closeTime must be HH:mm' })
  public closeTime?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  public isClosed?: boolean
}
