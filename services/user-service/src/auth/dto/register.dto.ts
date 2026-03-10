import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator'

export class RegisterWithEmailDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail({}, { message: 'Invalid email address' })
  public email: string

  @ApiProperty({ example: 'Password123!' })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(100)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain uppercase, lowercase and a number',
  })
  public password: string

  @ApiProperty({ example: 'Nguyen Van A' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  public fullName: string

  @ApiPropertyOptional({ example: '+84901234567' })
  @IsOptional()
  @Matches(/^\+[1-9]\d{1,14}$/, { message: 'Invalid phone number (E.164 format required)' })
  public phone?: string
}

export class RegisterWithPhoneDto {
  @ApiProperty({ example: '+84901234567' })
  @Matches(/^\+[1-9]\d{1,14}$/, { message: 'Invalid phone number (E.164 format required)' })
  public phone: string

  @ApiProperty({ example: 'Nguyen Van A' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  public fullName: string

  @ApiProperty({ example: '123456', description: 'OTP sent to phone' })
  @IsString()
  @IsNotEmpty()
  public otp: string

  @ApiPropertyOptional({ example: 'customer', enum: ['customer', 'driver', 'restaurant_owner'] })
  @IsOptional()
  @IsString()
  public role?: string

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  public agreeToTerms?: boolean
}
