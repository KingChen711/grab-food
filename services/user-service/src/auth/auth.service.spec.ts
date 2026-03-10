import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import type { Repository } from 'typeorm'

import { UsersService } from '../users/users.service'
import { AuthService } from './auth.service'
import { RefreshToken } from './entities/refresh-token.entity'
import { TokenBlacklistService } from './token-blacklist/token-blacklist.service'

describe('AuthService Logout', () => {
  let authService: AuthService
  let jwtService: jest.Mocked<JwtService>
  let tokenBlacklistService: jest.Mocked<TokenBlacklistService>
  let refreshTokenRepo: jest.Mocked<Repository<RefreshToken>>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {},
        },
        {
          provide: JwtService,
          useValue: {
            decode: jest.fn(),
            verifyAsync: jest.fn(),
            signAsync: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key) => {
              if (key === 'jwt.refreshSecret') return 'refresh_secret'
              if (key === 'jwt.accessExpiresIn') return '15m'
              return undefined
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
          provide: getRepositoryToken(RefreshToken),
          useValue: {
            update: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
      ],
    }).compile()

    authService = module.get<AuthService>(AuthService)
    jwtService = module.get(JwtService)
    tokenBlacklistService = module.get(TokenBlacklistService)
    refreshTokenRepo = module.get(getRepositoryToken(RefreshToken))
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('logout', () => {
    it('should extract and blacklist access token if provided', async () => {
      const now = Math.floor(Date.now() / 1000)
      const exp = now + 600 // expires in 10 minutes
      jwtService.decode.mockReturnValueOnce({ jti: 'test-jti', exp })

      await authService.logout('user-1', undefined, 'raw-access-token')

      expect(jwtService.decode).toHaveBeenCalledWith('raw-access-token')
      expect(tokenBlacklistService.blacklist).toHaveBeenCalledWith('test-jti', expect.any(Number))
    })

    it('should ignore access token blacklisting if token lacks jti', async () => {
      jwtService.decode.mockReturnValueOnce({ exp: 12345 })

      await authService.logout('user-1', undefined, 'raw-access-token')

      expect(tokenBlacklistService.blacklist).not.toHaveBeenCalled()
    })

    it('should revoke all user refresh tokens when no specific refresh token is given', async () => {
      await authService.logout('user-1')

      expect(refreshTokenRepo.update).toHaveBeenCalledWith(
        { user: { id: 'user-1' }, revokedAt: undefined },
        { revokedAt: expect.any(Date) },
      )
    })
  })

  describe('logoutAll', () => {
    it('should blacklist all user tokens and revoke refresh tokens', async () => {
      await authService.logoutAll('user-123')

      // accessExpiresIn is '15m' which is 900 seconds
      expect(tokenBlacklistService.blacklistAllForUser).toHaveBeenCalledWith('user-123', 900)
      expect(refreshTokenRepo.update).toHaveBeenCalledWith(
        { user: { id: 'user-123' }, revokedAt: undefined },
        { revokedAt: expect.any(Date) },
      )
    })
  })
})
