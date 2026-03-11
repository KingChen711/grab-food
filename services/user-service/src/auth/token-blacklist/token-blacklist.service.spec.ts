import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import type Redis from 'ioredis'

import { REDIS_CLIENT, TokenBlacklistService } from './token-blacklist.service'

describe('TokenBlacklistService', () => {
  let service: TokenBlacklistService
  let redisClient: jest.Mocked<Redis>

  beforeEach(async () => {
    const mockRedisClient = {
      set: jest.fn(),
      get: jest.fn(),
      exists: jest.fn(),
      disconnect: jest.fn(),
    } as unknown as jest.Mocked<Redis>

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenBlacklistService,
        {
          provide: REDIS_CLIENT,
          useValue: mockRedisClient,
        },
      ],
    }).compile()

    service = module.get<TokenBlacklistService>(TokenBlacklistService)
    redisClient = module.get(REDIS_CLIENT)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('blacklist', () => {
    it('should set the token in redis with TTL', async () => {
      await service.blacklist('test-jti', 60)

      expect(redisClient.set).toHaveBeenCalledWith('bl:jti:test-jti', '1', 'EX', 60)
    })

    it('should not set if ttl is 0 or negative', async () => {
      await service.blacklist('test-jti', 0)
      await service.blacklist('test-jti', -10)

      expect(redisClient.set).not.toHaveBeenCalled()
    })
  })

  describe('isBlacklisted', () => {
    it('should return true if token exists in redis', async () => {
      redisClient.exists.mockResolvedValueOnce(1)

      const result = await service.isBlacklisted('test-jti')

      expect(result).toBe(true)
      expect(redisClient.exists).toHaveBeenCalledWith('bl:jti:test-jti')
    })

    it('should return false if token does not exist in redis', async () => {
      redisClient.exists.mockResolvedValueOnce(0)

      const result = await service.isBlacklisted('test-jti')

      expect(result).toBe(false)
    })
  })

  describe('blacklistAllForUser', () => {
    it('should set a timestamp for the user with TTL', async () => {
      jest.useFakeTimers()
      jest.setSystemTime(new Date('2026-03-10T12:00:00Z'))
      const expectedTimestamp = Math.floor(Date.now() / 1000).toString()

      await service.blacklistAllForUser('user-123', 3600)

      expect(redisClient.set).toHaveBeenCalledWith(
        'bl:user:user-123',
        expectedTimestamp,
        'EX',
        3600,
      )

      jest.useRealTimers()
    })
  })

  describe('isUserRevokedBefore', () => {
    it('should return true if token was issued before revoke timestamp', async () => {
      const issueTime = 1000
      const revokeTime = 1005
      redisClient.get.mockResolvedValueOnce(revokeTime.toString())

      const result = await service.isUserRevokedBefore('user-123', issueTime)

      expect(result).toBe(true)
      expect(redisClient.get).toHaveBeenCalledWith('bl:user:user-123')
    })

    it('should return true if token was issued at exact same second as revoke', async () => {
      const time = 1000
      redisClient.get.mockResolvedValueOnce(time.toString())

      const result = await service.isUserRevokedBefore('user-123', time)

      expect(result).toBe(true)
    })

    it('should return false if token was issued after revoke timestamp', async () => {
      const issueTime = 1010
      const revokeTime = 1005
      redisClient.get.mockResolvedValueOnce(revokeTime.toString())

      const result = await service.isUserRevokedBefore('user-123', issueTime)

      expect(result).toBe(false)
    })

    it('should return false if user has no revoke timestamp', async () => {
      redisClient.get.mockResolvedValueOnce(null)

      const result = await service.isUserRevokedBefore('user-123', 1000)

      expect(result).toBe(false)
    })
  })
})
