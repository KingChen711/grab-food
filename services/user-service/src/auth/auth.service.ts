import type { AuthTokens, JwtPayload } from '@grab/types'
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common'
import type { ConfigService } from '@nestjs/config'
import type { JwtService } from '@nestjs/jwt'
import { InjectRepository } from '@nestjs/typeorm'
import * as bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'
import type { Repository } from 'typeorm'

import type { UsersService } from '../users/users.service'
import type { LoginWithEmailDto, LoginWithPhoneDto } from './dto/login.dto'
import type { RegisterWithEmailDto, RegisterWithPhoneDto } from './dto/register.dto'
import { RefreshToken } from './entities/refresh-token.entity'

const BCRYPT_ROUNDS = 12
const REFRESH_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000 // 7 days default

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepo: Repository<RefreshToken>,
  ) {}

  // ─── Registration ─────────────────────────────────────────────────────────

  public async registerWithEmail(
    dto: RegisterWithEmailDto,
    ipAddress?: string,
  ): Promise<AuthTokens> {
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS)

    const user = await this.usersService.create({
      email: dto.email,
      phone: dto.phone,
      passwordHash,
      fullName: dto.fullName,
      role: 'customer',
    })

    this.logger.log(`User registered via email: ${user.id}`)
    return this.issueTokenPair(user.id, user.email ?? undefined, undefined, user.role, ipAddress)
  }

  public async registerWithPhone(
    dto: RegisterWithPhoneDto,
    ipAddress?: string,
  ): Promise<AuthTokens> {
    // In a real implementation, verify OTP before proceeding.
    // For now we create the user and mark phone verified.
    const existing = await this.usersService.findByPhone(dto.phone)
    if (existing) throw new ConflictException('Phone number is already registered')

    const user = await this.usersService.create({
      phone: dto.phone,
      fullName: dto.fullName,
      role: (dto.role as 'customer' | 'driver' | 'restaurant_owner') ?? 'customer',
    })

    await this.usersService.markPhoneVerified(user.id)

    this.logger.log(`User registered via phone: ${user.id}`)
    return this.issueTokenPair(user.id, undefined, dto.phone, user.role, ipAddress)
  }

  // ─── Login ────────────────────────────────────────────────────────────────

  public async loginWithEmail(dto: LoginWithEmailDto, ipAddress?: string): Promise<AuthTokens> {
    const user = await this.usersService.findByEmail(dto.email)
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials')
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash)
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials')
    }

    if (user.status === 'suspended') {
      throw new ForbiddenException('Account suspended. Contact support.')
    }

    const extendedExpiry = dto.rememberMe ? 30 * 24 * 60 * 60 * 1000 : undefined
    return this.issueTokenPair(
      user.id,
      user.email ?? undefined,
      user.phone ?? undefined,
      user.role,
      ipAddress,
      extendedExpiry,
    )
  }

  public async loginWithPhone(dto: LoginWithPhoneDto, ipAddress?: string): Promise<AuthTokens> {
    // OTP verification should be done before calling this method.
    const user = await this.usersService.findByPhone(dto.phone)
    if (!user) {
      throw new UnauthorizedException('Phone number not registered')
    }

    if (user.status === 'suspended') {
      throw new ForbiddenException('Account suspended. Contact support.')
    }

    return this.issueTokenPair(user.id, undefined, dto.phone, user.role, ipAddress)
  }

  // ─── Refresh Token Rotation ───────────────────────────────────────────────

  public async refreshTokens(rawRefreshToken: string, ipAddress?: string): Promise<AuthTokens> {
    // 1. Verify JWT signature and expiry
    let payload: JwtPayload & { jti: string; familyId: string }
    try {
      payload = await this.jwtService.verifyAsync(rawRefreshToken, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
      })
    } catch {
      throw new UnauthorizedException('Invalid refresh token')
    }

    // 2. Find the stored token record by its JTI
    const storedToken = await this.refreshTokenRepo.findOne({
      where: { id: payload.jti },
      relations: ['user'],
    })

    if (!storedToken) {
      throw new UnauthorizedException('Refresh token not found')
    }

    // 3. Token reuse detection — if this token was already revoked/replaced,
    //    the entire family has been compromised: revoke all tokens in the family.
    if (storedToken.isRevoked) {
      await this.revokeTokenFamily(storedToken.familyId)
      this.logger.warn(
        `Token reuse detected for family ${storedToken.familyId}, all tokens revoked`,
      )
      throw new ForbiddenException('Refresh token already used. Please log in again.')
    }

    if (storedToken.isExpired) {
      throw new UnauthorizedException('Refresh token expired')
    }

    // 4. Revoke the current token and record which token replaces it
    const user = storedToken.user

    // 5. Issue new token pair (rotation: new refresh token, old one revoked)
    const tokens = await this.issueTokenPair(
      user.id,
      user.email ?? undefined,
      user.phone ?? undefined,
      user.role,
      ipAddress,
      undefined,
      storedToken.familyId,
    )

    // Mark the old token as replaced
    await this.refreshTokenRepo.update(storedToken.id, { revokedAt: new Date() })

    return tokens
  }

  public async logout(userId: string, rawRefreshToken?: string): Promise<void> {
    if (rawRefreshToken) {
      try {
        const payload = await this.jwtService.verifyAsync<{ jti: string }>(rawRefreshToken, {
          secret: this.configService.get<string>('jwt.refreshSecret'),
        })
        await this.refreshTokenRepo.update(payload.jti, { revokedAt: new Date() })
      } catch {
        // Ignore invalid token during logout
      }
      return
    }
    // Revoke all tokens for the user (logout from all devices)
    await this.refreshTokenRepo.update(
      { user: { id: userId }, revokedAt: undefined as unknown as Date },
      { revokedAt: new Date() },
    )
  }

  // ─── Internal Helpers ─────────────────────────────────────────────────────

  private async issueTokenPair(
    userId: string,
    email: string | undefined,
    phone: string | undefined,
    role: string,
    ipAddress?: string,
    refreshExpiryMs?: number,
    existingFamilyId?: string,
  ): Promise<AuthTokens> {
    const accessSecret = this.configService.get<string>('jwt.accessSecret')
    const refreshSecret = this.configService.get<string>('jwt.refreshSecret')
    const accessExpiresIn = this.configService.get<string>('jwt.accessExpiresIn') ?? '15m'
    const refreshExpiresIn = this.configService.get<string>('jwt.refreshExpiresIn') ?? '7d'

    // Create a new refresh token DB record (its ID becomes the JWT `jti`)
    const familyId = existingFamilyId ?? randomUUID()
    const expiresAt = new Date(Date.now() + (refreshExpiryMs ?? REFRESH_TOKEN_EXPIRY_MS))

    const refreshTokenRecord = this.refreshTokenRepo.create({
      user: { id: userId },
      tokenHash: '', // will be updated after signing
      familyId,
      ipAddress: ipAddress ?? null,
      expiresAt,
      revokedAt: null,
    })
    const savedRecord = await this.refreshTokenRepo.save(refreshTokenRecord)

    const basePayload = { sub: userId, email, phone, role }

    type ExpiresIn = `${number}${'s' | 'm' | 'h' | 'd'}`
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(basePayload, {
        secret: accessSecret,
        expiresIn: accessExpiresIn as ExpiresIn,
      }),
      this.jwtService.signAsync(
        { ...basePayload, jti: savedRecord.id, familyId },
        { secret: refreshSecret, expiresIn: refreshExpiresIn as ExpiresIn },
      ),
    ])

    // Store a hash of the refresh token (never store raw tokens)
    const tokenHash = await bcrypt.hash(refreshToken, 6)
    await this.refreshTokenRepo.update(savedRecord.id, { tokenHash })

    const accessExpiresInSeconds = this.parseExpiry(accessExpiresIn)

    return { accessToken, refreshToken, expiresIn: accessExpiresInSeconds }
  }

  private async revokeTokenFamily(familyId: string): Promise<void> {
    await this.refreshTokenRepo
      .createQueryBuilder()
      .update(RefreshToken)
      .set({ revokedAt: new Date() })
      .where('family_id = :familyId AND revoked_at IS NULL', { familyId })
      .execute()
  }

  private parseExpiry(expiry: string): number {
    const match = /^(\d+)([smhd])$/.exec(expiry)
    if (!match) return 900
    const value = parseInt(match[1], 10)
    const unit = match[2]
    const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 }
    return value * (multipliers[unit] ?? 1)
  }
}
