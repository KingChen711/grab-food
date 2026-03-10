import type { AuthTokens } from '@grab/types'
import { Body, Controller, HttpCode, HttpStatus, Ip, Post, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'

import { CurrentUser } from '../common/decorators/current-user.decorator'
import { Public } from '../common/decorators/public.decorator'
import type { User } from '../users/entities/user.entity'
import type { AuthService } from './auth.service'
import type { LoginWithEmailDto, LoginWithPhoneDto } from './dto/login.dto'
import type { RefreshTokenDto } from './dto/refresh-token.dto'
import type { RegisterWithEmailDto, RegisterWithPhoneDto } from './dto/register.dto'
import { JwtAuthGuard } from './guards/jwt-auth.guard'

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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
  @ApiOperation({ summary: 'Logout (revoke refresh token)' })
  public logout(@CurrentUser() user: User, @Body() dto: Partial<RefreshTokenDto>): Promise<void> {
    return this.authService.logout(user.id, dto.refreshToken)
  }
}
