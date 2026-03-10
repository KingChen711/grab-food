import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsBoolean, IsEmail, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator'

export class LoginWithEmailDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail({}, { message: 'Invalid email address' })
  public email: string

  @ApiProperty({ example: 'Password123!' })
  @IsString()
  @IsNotEmpty()
  public password: string

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  public rememberMe?: boolean
}

export class LoginWithPhoneDto {
  @ApiProperty({ example: '+84901234567' })
  @Matches(/^\+[1-9]\d{1,14}$/, { message: 'Invalid phone number (E.164 format required)' })
  public phone: string

  @ApiProperty({ example: '123456', description: 'OTP sent to phone' })
  @IsString()
  @IsNotEmpty()
  public otp: string
}
