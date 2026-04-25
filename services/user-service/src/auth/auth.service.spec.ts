import { ConflictException, ForbiddenException, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import * as bcrypt from 'bcryptjs'
import type { Repository } from 'typeorm'

import type { User } from '../users/entities/user.entity'
import { UsersService } from '../users/users.service'
import { AuthService } from './auth.service'
import { RefreshToken } from './entities/refresh-token.entity'
import { GoogleAuthService } from './google/google-auth.service'
import { OtpService } from './otp/otp.service'
import { TokenBlacklistService } from './token-blacklist/token-blacklist.service'

describe('AuthService', () => {
  let authService: AuthService
  let usersService: jest.Mocked<UsersService>
  let jwtService: jest.Mocked<JwtService>
  let tokenBlacklistService: jest.Mocked<TokenBlacklistService>
  let refreshTokenRepo: jest.Mocked<Repository<RefreshToken>>
  let googleAuthService: jest.Mocked<GoogleAuthService>
  let otpService: jest.Mocked<OtpService>

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    phone: '+84900000000',
    role: 'customer',
    status: 'active',
    isEmailVerified: true,
    isPhoneVerified: false,
    googleId: null,
    passwordHash: bcrypt.hashSync('Password123!', 6),
    profile: { fullName: 'Test User' },
  } as unknown as User

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            create: jest.fn(),
            findByEmail: jest.fn(),
            findByPhone: jest.fn(),
            findByGoogleId: jest.fn(),
            findById: jest.fn(),
            linkGoogleId: jest.fn(),
            markPhoneVerified: jest.fn(),
            markEmailVerified: jest.fn(),
            updatePassword: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            decode: jest.fn(),
            verifyAsync: jest.fn(),
            signAsync: jest.fn().mockResolvedValue('mock-token'),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => {
              const values: Record<string, string> = {
                'jwt.accessSecret': 'access_secret',
                'jwt.refreshSecret': 'refresh_secret',
                'jwt.accessExpiresIn': '15m',
                'jwt.refreshExpiresIn': '7d',
              }
              return values[key]
            }),
          },
        },
        {
          provide: TokenBlacklistService,
          useValue: {
            blacklist: jest.fn(),
            blacklistAllForUser: jest.fn(),
          },
        },
        {
          provide: GoogleAuthService,
          useValue: {
            verifyAccessToken: jest.fn(),
          },
        },
        {
          provide: OtpService,
          useValue: {
            generateAndStoreOtp: jest.fn(),
            verifyOtp: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(RefreshToken),
          useValue: {
            create: jest.fn().mockReturnValue({ id: 'rt-1', familyId: 'family-1' }),
            save: jest.fn().mockResolvedValue({ id: 'rt-1', familyId: 'family-1' }),
            update: jest.fn().mockResolvedValue(undefined),
            findOne: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue({
              update: jest.fn().mockReturnThis(),
              set: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              execute: jest.fn().mockResolvedValue(undefined),
            }),
          },
        },
      ],
    }).compile()

    authService = module.get<AuthService>(AuthService)
    usersService = module.get(UsersService)
    jwtService = module.get(JwtService)
    tokenBlacklistService = module.get(TokenBlacklistService)
    refreshTokenRepo = module.get(getRepositoryToken(RefreshToken))
    googleAuthService = module.get(GoogleAuthService)
    otpService = module.get(OtpService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  // ─── Registration ─────────────────────────────────────────────────────────

  describe('registerWithEmail', () => {
    it('should register a new user and return tokens', async () => {
      usersService.create.mockResolvedValueOnce(mockUser)

      const result = await authService.registerWithEmail({
        email: 'new@example.com',
        password: 'Password123!',
        fullName: 'New User',
      })

      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'new@example.com', fullName: 'New User' }),
      )
      expect(result.accessToken).toBeDefined()
      expect(result.refreshToken).toBeDefined()
    })

    it('should propagate ConflictException when email already exists', async () => {
      usersService.create.mockRejectedValueOnce(
        new ConflictException('Email is already registered'),
      )

      await expect(
        authService.registerWithEmail({
          email: 'existing@example.com',
          password: 'Password123!',
          fullName: 'Dup User',
        }),
      ).rejects.toThrow(ConflictException)
    })
  })

  describe('registerWithPhone', () => {
    it('should register with valid OTP and mark phone verified', async () => {
      otpService.verifyOtp.mockResolvedValueOnce(true)
      usersService.findByPhone.mockResolvedValueOnce(null)
      usersService.create.mockResolvedValueOnce(mockUser)

      const result = await authService.registerWithPhone({
        phone: '+84900000001',
        otp: '123456',
        fullName: 'Phone User',
      })

      expect(otpService.verifyOtp).toHaveBeenCalledWith('+84900000001', '123456')
      expect(usersService.markPhoneVerified).toHaveBeenCalledWith(mockUser.id)
      expect(result.accessToken).toBeDefined()
    })

    it('should throw UnauthorizedException for invalid OTP', async () => {
      otpService.verifyOtp.mockResolvedValueOnce(false)

      await expect(
        authService.registerWithPhone({
          phone: '+84900000001',
          otp: '000000',
          fullName: 'Phone User',
        }),
      ).rejects.toThrow(UnauthorizedException)
    })

    it('should throw ConflictException for duplicate phone', async () => {
      otpService.verifyOtp.mockResolvedValueOnce(true)
      usersService.findByPhone.mockResolvedValueOnce(mockUser)

      await expect(
        authService.registerWithPhone({
          phone: '+84900000000',
          otp: '123456',
          fullName: 'Phone User',
        }),
      ).rejects.toThrow(ConflictException)
    })
  })

  // ─── Login ────────────────────────────────────────────────────────────────

  describe('loginWithEmail', () => {
    it('should login with correct credentials', async () => {
      const userWithPw = { ...mockUser, passwordHash: bcrypt.hashSync('Password123!', 6) }
      usersService.findByEmail.mockResolvedValueOnce(userWithPw as User)

      const result = await authService.loginWithEmail({
        email: 'test@example.com',
        password: 'Password123!',
      })

      expect(result.accessToken).toBeDefined()
      expect(result.refreshToken).toBeDefined()
    })

    it('should throw UnauthorizedException for wrong password', async () => {
      const userWithPw = { ...mockUser, passwordHash: bcrypt.hashSync('Password123!', 6) }
      usersService.findByEmail.mockResolvedValueOnce(userWithPw as User)

      await expect(
        authService.loginWithEmail({
          email: 'test@example.com',
          password: 'WrongPassword!',
        }),
      ).rejects.toThrow(UnauthorizedException)
    })

    it('should throw UnauthorizedException when user not found', async () => {
      usersService.findByEmail.mockResolvedValueOnce(null)

      await expect(
        authService.loginWithEmail({
          email: 'noone@example.com',
          password: 'Password123!',
        }),
      ).rejects.toThrow(UnauthorizedException)
    })

    it('should throw ForbiddenException for suspended account', async () => {
      const suspendedUser = {
        ...mockUser,
        status: 'suspended',
        passwordHash: bcrypt.hashSync('Password123!', 6),
      }
      usersService.findByEmail.mockResolvedValueOnce(suspendedUser as User)

      await expect(
        authService.loginWithEmail({
          email: 'test@example.com',
          password: 'Password123!',
        }),
      ).rejects.toThrow(ForbiddenException)
    })
  })

  describe('loginWithPhone', () => {
    it('should login with valid OTP', async () => {
      otpService.verifyOtp.mockResolvedValueOnce(true)
      usersService.findByPhone.mockResolvedValueOnce(mockUser)

      const result = await authService.loginWithPhone({
        phone: '+84900000000',
        otp: '123456',
      })

      expect(result.accessToken).toBeDefined()
    })

    it('should throw UnauthorizedException for invalid OTP', async () => {
      otpService.verifyOtp.mockResolvedValueOnce(false)

      await expect(
        authService.loginWithPhone({ phone: '+84900000000', otp: '000000' }),
      ).rejects.toThrow(UnauthorizedException)
    })

    it('should throw UnauthorizedException for unregistered phone', async () => {
      otpService.verifyOtp.mockResolvedValueOnce(true)
      usersService.findByPhone.mockResolvedValueOnce(null)

      await expect(
        authService.loginWithPhone({ phone: '+84999999999', otp: '123456' }),
      ).rejects.toThrow(UnauthorizedException)
    })

    it('should throw ForbiddenException for suspended account', async () => {
      otpService.verifyOtp.mockResolvedValueOnce(true)
      const suspendedUser = { ...mockUser, status: 'suspended' }
      usersService.findByPhone.mockResolvedValueOnce(suspendedUser as User)

      await expect(
        authService.loginWithPhone({ phone: '+84900000000', otp: '123456' }),
      ).rejects.toThrow(ForbiddenException)
    })
  })

  // ─── Refresh Token Rotation ───────────────────────────────────────────────

  describe('refreshTokens', () => {
    const payload = { sub: 'user-1', jti: 'rt-1', familyId: 'family-1' }

    it('should rotate tokens successfully', async () => {
      jwtService.verifyAsync.mockResolvedValueOnce(payload)
      refreshTokenRepo.findOne.mockResolvedValueOnce({
        id: 'rt-1',
        familyId: 'family-1',
        revokedAt: null,
        expiresAt: new Date(Date.now() + 86400000),
        user: mockUser,
        get isRevoked() {
          return this.revokedAt !== null
        },
        get isExpired() {
          return this.expiresAt < new Date()
        },
      } as unknown as RefreshToken)

      const result = await authService.refreshTokens('old-refresh-token')

      expect(refreshTokenRepo.update).toHaveBeenCalledWith('rt-1', {
        revokedAt: expect.any(Date),
      })
      expect(result.accessToken).toBeDefined()
      expect(result.refreshToken).toBeDefined()
    })

    it('should throw UnauthorizedException for invalid JWT', async () => {
      jwtService.verifyAsync.mockRejectedValueOnce(new Error('invalid'))

      await expect(authService.refreshTokens('bad-token')).rejects.toThrow(UnauthorizedException)
    })

    it('should revoke entire family on token reuse', async () => {
      jwtService.verifyAsync.mockResolvedValueOnce(payload)
      refreshTokenRepo.findOne.mockResolvedValueOnce({
        id: 'rt-1',
        familyId: 'family-1',
        revokedAt: new Date(), // already revoked = reuse
        expiresAt: new Date(Date.now() + 86400000),
        user: mockUser,
        get isRevoked() {
          return this.revokedAt !== null
        },
        get isExpired() {
          return this.expiresAt < new Date()
        },
      } as unknown as RefreshToken)

      const qb = refreshTokenRepo.createQueryBuilder()

      await expect(authService.refreshTokens('reused-token')).rejects.toThrow(ForbiddenException)
      expect(qb.update).toHaveBeenCalled()
    })

    it('should throw UnauthorizedException for expired token', async () => {
      jwtService.verifyAsync.mockResolvedValueOnce(payload)
      refreshTokenRepo.findOne.mockResolvedValueOnce({
        id: 'rt-1',
        familyId: 'family-1',
        revokedAt: null,
        expiresAt: new Date(Date.now() - 1000), // expired
        user: mockUser,
        get isRevoked() {
          return this.revokedAt !== null
        },
        get isExpired() {
          return this.expiresAt < new Date()
        },
      } as unknown as RefreshToken)

      await expect(authService.refreshTokens('expired-token')).rejects.toThrow(
        UnauthorizedException,
      )
    })

    it('should throw UnauthorizedException when token record not found', async () => {
      jwtService.verifyAsync.mockResolvedValueOnce(payload)
      refreshTokenRepo.findOne.mockResolvedValueOnce(null)

      await expect(authService.refreshTokens('unknown-token')).rejects.toThrow(
        UnauthorizedException,
      )
    })
  })

  // ─── Google OAuth2 ─────────────────────────────────────────────────────────

  describe('loginWithGoogle', () => {
    const googleProfile = {
      googleId: 'google-123',
      email: 'google@example.com',
      name: 'Google User',
    }

    it('should login existing user by googleId', async () => {
      googleAuthService.verifyAccessToken.mockResolvedValueOnce(googleProfile)
      usersService.findByGoogleId.mockResolvedValueOnce(mockUser)

      const result = await authService.loginWithGoogle('google-id-token')

      expect(usersService.create).not.toHaveBeenCalled()
      expect(result.accessToken).toBeDefined()
    })

    it('should link Google to existing account by email', async () => {
      googleAuthService.verifyAccessToken.mockResolvedValueOnce(googleProfile)
      usersService.findByGoogleId.mockResolvedValueOnce(null)
      usersService.findByEmail.mockResolvedValueOnce(mockUser)
      usersService.findById.mockResolvedValueOnce(mockUser)

      const result = await authService.loginWithGoogle('google-id-token')

      expect(usersService.linkGoogleId).toHaveBeenCalledWith(mockUser.id, 'google-123')
      expect(result.accessToken).toBeDefined()
    })

    it('should create new user when no existing account found', async () => {
      googleAuthService.verifyAccessToken.mockResolvedValueOnce(googleProfile)
      usersService.findByGoogleId.mockResolvedValueOnce(null)
      usersService.findByEmail.mockResolvedValueOnce(null)
      usersService.create.mockResolvedValueOnce(mockUser)
      usersService.findById.mockResolvedValueOnce(mockUser)

      const result = await authService.loginWithGoogle('google-id-token')

      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'google@example.com',
          googleId: 'google-123',
        }),
      )
      expect(result.accessToken).toBeDefined()
    })

    it('should throw ForbiddenException for suspended Google user', async () => {
      const suspendedUser = { ...mockUser, status: 'suspended' }
      googleAuthService.verifyAccessToken.mockResolvedValueOnce(googleProfile)
      usersService.findByGoogleId.mockResolvedValueOnce(suspendedUser as User)

      await expect(authService.loginWithGoogle('google-id-token')).rejects.toThrow(
        ForbiddenException,
      )
    })
  })

  // ─── Password Reset ────────────────────────────────────────────────────────

  describe('forgotPassword', () => {
    it('should generate OTP for existing user', async () => {
      usersService.findByEmail.mockResolvedValueOnce(mockUser)

      await authService.forgotPassword('test@example.com')

      expect(otpService.generateAndStoreOtp).toHaveBeenCalledWith(
        'test@example.com',
        'RESET_PASSWORD',
      )
    })

    it('should not throw for non-existent email (prevents enumeration)', async () => {
      usersService.findByEmail.mockResolvedValueOnce(null)

      await expect(authService.forgotPassword('nobody@example.com')).resolves.toBeUndefined()
      expect(otpService.generateAndStoreOtp).not.toHaveBeenCalled()
    })
  })

  describe('resetPassword', () => {
    it('should reset password and logout all sessions', async () => {
      otpService.verifyOtp.mockResolvedValueOnce(true)
      usersService.findByEmail.mockResolvedValueOnce(mockUser)

      await authService.resetPassword('test@example.com', '123456', 'NewPassword123!')

      expect(usersService.updatePassword).toHaveBeenCalledWith(mockUser.id, expect.any(String))
      expect(tokenBlacklistService.blacklistAllForUser).toHaveBeenCalledWith(mockUser.id, 900)
    })

    it('should throw UnauthorizedException for invalid OTP', async () => {
      otpService.verifyOtp.mockResolvedValueOnce(false)

      await expect(
        authService.resetPassword('test@example.com', '000000', 'NewPassword123!'),
      ).rejects.toThrow(UnauthorizedException)
    })

    it('should throw UnauthorizedException when user not found after valid OTP', async () => {
      otpService.verifyOtp.mockResolvedValueOnce(true)
      usersService.findByEmail.mockResolvedValueOnce(null)

      await expect(
        authService.resetPassword('nobody@example.com', '123456', 'NewPassword123!'),
      ).rejects.toThrow(UnauthorizedException)
    })
  })

  // ─── Logout ───────────────────────────────────────────────────────────────

  describe('logout', () => {
    it('should blacklist access token if provided', async () => {
      const now = Math.floor(Date.now() / 1000)
      jwtService.decode.mockReturnValueOnce({ jti: 'test-jti', exp: now + 600 })

      await authService.logout('user-1', undefined, 'raw-access-token')

      expect(jwtService.decode).toHaveBeenCalledWith('raw-access-token')
      expect(tokenBlacklistService.blacklist).toHaveBeenCalledWith('test-jti', expect.any(Number))
    })

    it('should skip blacklisting when access token lacks jti', async () => {
      jwtService.decode.mockReturnValueOnce({ exp: 12345 })

      await authService.logout('user-1', undefined, 'raw-access-token')

      expect(tokenBlacklistService.blacklist).not.toHaveBeenCalled()
    })

    it('should revoke specific refresh token when provided', async () => {
      jwtService.verifyAsync.mockResolvedValueOnce({ jti: 'rt-1' })

      await authService.logout('user-1', 'raw-refresh-token')

      expect(refreshTokenRepo.update).toHaveBeenCalledWith('rt-1', {
        revokedAt: expect.any(Date),
      })
    })

    it('should revoke all user refresh tokens when no specific token given', async () => {
      await authService.logout('user-1')

      expect(refreshTokenRepo.update).toHaveBeenCalledWith(
        { user: { id: 'user-1' }, revokedAt: expect.objectContaining({ _type: 'isNull' }) },
        { revokedAt: expect.any(Date) },
      )
    })
  })

  describe('logoutAll', () => {
    it('should blacklist all user tokens and revoke all refresh tokens', async () => {
      await authService.logoutAll('user-123')

      expect(tokenBlacklistService.blacklistAllForUser).toHaveBeenCalledWith('user-123', 900)
      expect(refreshTokenRepo.update).toHaveBeenCalledWith(
        { user: { id: 'user-123' }, revokedAt: expect.objectContaining({ _type: 'isNull' }) },
        { revokedAt: expect.any(Date) },
      )
    })
  })
})
