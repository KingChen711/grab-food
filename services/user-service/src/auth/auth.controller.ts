import type { AuthTokens } from '@grab/types'
import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  Ip,
  Post,
  UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'

import { CurrentUser } from '../common/decorators/current-user.decorator'
import { Public } from '../common/decorators/public.decorator'
import type { User } from '../users/entities/user.entity'
import { AuthService } from './auth.service'
import type { ForgotPasswordDto, GoogleVerifyDto, ResetPasswordDto } from './dto/google-verify.dto'
import type { LoginWithEmailDto, LoginWithPhoneDto } from './dto/login.dto'
import type { RefreshTokenDto } from './dto/refresh-token.dto'
import type { RegisterWithEmailDto, RegisterWithPhoneDto } from './dto/register.dto'
import { JwtAuthGuard } from './guards/jwt-auth.guard'

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  @Public()
  @Post('register/email')
  @Throttle({ short: { ttl: 60_000, limit: 5 } })
  @ApiOperation({ summary: 'Register new account with email and password' })
  @ApiResponse({ status: 201, description: 'Returns JWT access and refresh tokens' })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  public registerWithEmail(
    @Body() dto: RegisterWithEmailDto,
    @Ip() ip: string,
  ): Promise<AuthTokens> {
    return this.authService.registerWithEmail(dto, ip)
  }

  @Public()
  @Post('register/phone')
  @Throttle({ short: { ttl: 60_000, limit: 5 } })
  @ApiOperation({ summary: 'Register new account with phone and OTP' })
  @ApiResponse({ status: 201, description: 'Returns JWT access and refresh tokens' })
  @ApiResponse({ status: 409, description: 'Phone already registered' })
  public registerWithPhone(
    @Body() dto: RegisterWithPhoneDto,
    @Ip() ip: string,
  ): Promise<AuthTokens> {
    return this.authService.registerWithPhone(dto, ip)
  }

  @Public()
  @Post('login/email')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { ttl: 60_000, limit: 10 } })
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, description: 'Returns JWT access and refresh tokens' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  public loginWithEmail(@Body() dto: LoginWithEmailDto, @Ip() ip: string): Promise<AuthTokens> {
    return this.authService.loginWithEmail(dto, ip)
  }

  @Public()
  @Post('login/phone')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { ttl: 60_000, limit: 10 } })
  @ApiOperation({ summary: 'Login with phone and OTP' })
  @ApiResponse({ status: 200, description: 'Returns JWT access and refresh tokens' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  public loginWithPhone(@Body() dto: LoginWithPhoneDto, @Ip() ip: string): Promise<AuthTokens> {
    return this.authService.loginWithPhone(dto, ip)
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { ttl: 60_000, limit: 20 } })
  @ApiOperation({ summary: 'Rotate refresh token and get new token pair' })
  @ApiResponse({ status: 200, description: 'Returns new JWT access and refresh tokens' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  @ApiResponse({ status: 403, description: 'Token reuse detected — all sessions revoked' })
  public refresh(@Body() dto: RefreshTokenDto, @Ip() ip: string): Promise<AuthTokens> {
    return this.authService.refreshTokens(dto.refreshToken, ip)
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout (revoke refresh token and blacklist access token)' })
  public logout(
    @CurrentUser() user: User,
    @Body() dto: Partial<RefreshTokenDto>,
    @Headers('authorization') authHeader?: string,
  ): Promise<void> {
    const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined
    return this.authService.logout(user.id, dto.refreshToken, accessToken)
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout from all devices (revoke all sessions)' })
  public logoutAll(@CurrentUser() user: User): Promise<void> {
    return this.authService.logoutAll(user.id)
  }

  // ─── Google OAuth2 ────────────────────────────────────────

  @Public()
  @Post('google/verify')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { ttl: 60_000, limit: 10 } })
  @ApiOperation({ summary: 'Verify Google ID Token and return system JWT tokens' })
  @ApiResponse({ status: 200, description: 'Login successful, returns JWT tokens' })
  @ApiResponse({ status: 401, description: 'Invalid Google token' })
  public loginWithGoogle(@Body() dto: GoogleVerifyDto, @Ip() ip: string): Promise<AuthTokens> {
    return this.authService.loginWithGoogle(dto.accessToken, ip)
  }

  // ─── Password Reset ───────────────────────────────────────

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ short: { ttl: 60_000, limit: 5 } })
  @ApiOperation({ summary: 'Request a password reset OTP via email' })
  @ApiResponse({
    status: 204,
    description: 'OTP sent if email exists (always 204 to prevent enumeration)',
  })
  public forgotPassword(@Body() dto: ForgotPasswordDto): Promise<void> {
    return this.authService.forgotPassword(dto.email)
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ short: { ttl: 60_000, limit: 5 } })
  @ApiOperation({ summary: 'Reset password using OTP received via email' })
  @ApiResponse({ status: 204, description: 'Password reset successfully' })
  @ApiResponse({ status: 401, description: 'Invalid or expired OTP' })
  public resetPassword(@Body() dto: ResetPasswordDto): Promise<void> {
    return this.authService.resetPassword(dto.email, dto.otp, dto.newPassword)
  }
}
