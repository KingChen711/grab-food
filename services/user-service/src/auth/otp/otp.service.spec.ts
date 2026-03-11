import { EventEmitter2 } from '@nestjs/event-emitter'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'

import { NOTIFICATION_EVENTS } from '../events/notification.events'
import { TokenBlacklistService } from '../token-blacklist/token-blacklist.service'
import { OtpService } from './otp.service'

describe('OtpService', () => {
  let service: OtpService
  let tokenBlacklistService: jest.Mocked<TokenBlacklistService>
  let eventEmitter: jest.Mocked<EventEmitter2>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OtpService,
        {
          provide: TokenBlacklistService,
          useValue: {
            setRaw: jest.fn(),
            getRaw: jest.fn(),
            deleteRaw: jest.fn(),
          },
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile()

    service = module.get<OtpService>(OtpService)
    tokenBlacklistService = module.get(TokenBlacklistService)
    eventEmitter = module.get(EventEmitter2)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('generateAndStoreOtp', () => {
    it('should generate OTP, store in redis via TokenBlacklistService, and emit event', async () => {
      await service.generateAndStoreOtp('test@example.com', 'RESET_PASSWORD')

      expect(tokenBlacklistService.setRaw).toHaveBeenCalledWith(
        'otp:email:test@example.com',
        expect.any(String),
        600, // 10 minutes
      )
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        NOTIFICATION_EVENTS.SEND_OTP_EMAIL,
        expect.objectContaining({
          to: 'test@example.com',
          action: 'RESET_PASSWORD',
        }),
      )
    })
  })

  describe('verifyOtp', () => {
    it('should return true and delete OTP if valid', async () => {
      tokenBlacklistService.getRaw.mockResolvedValueOnce('123456')

      const result = await service.verifyOtp('test@example.com', '123456')

      expect(result).toBe(true)
      expect(tokenBlacklistService.deleteRaw).toHaveBeenCalledWith('otp:email:test@example.com')
    })

    it('should return false if OTP is invalid or not found', async () => {
      tokenBlacklistService.getRaw.mockResolvedValueOnce('123456')

      const result = await service.verifyOtp('test@example.com', '000000')

      expect(result).toBe(false)
      expect(tokenBlacklistService.deleteRaw).not.toHaveBeenCalled()
    })
  })
})
