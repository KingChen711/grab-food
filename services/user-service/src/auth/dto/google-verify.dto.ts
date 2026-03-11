import { ApiProperty } from '@nestjs/swagger'
import { IsEmail, IsString, Length, MinLength } from 'class-validator'

export class GoogleVerifyDto {
  @ApiProperty({ description: 'Google ID Token from the frontend Google SDK' })
  @IsString()
  public idToken: string
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  public email: string
}

export class ResetPasswordDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  public email: string

  @ApiProperty({ description: '6-digit OTP sent to email', example: '123456' })
  @IsString()
  @Length(6, 6)
  public otp: string

  @ApiProperty({ description: 'New password (min 8 chars)', minLength: 8 })
  @IsString()
  @MinLength(8)
  public newPassword: string
}
