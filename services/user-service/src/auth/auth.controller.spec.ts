import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'

import type { User } from '../users/entities/user.entity'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import type { GoogleVerifyDto } from './dto/google-verify.dto'
import type { LoginWithEmailDto } from './dto/login.dto'
import type { RegisterWithEmailDto } from './dto/register.dto'

describe('AuthController', () => {
  let controller: AuthController
  let authService: jest.Mocked<AuthService>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            registerWithEmail: jest.fn(),
            registerWithPhone: jest.fn(),
            loginWithEmail: jest.fn(),
            loginWithPhone: jest.fn(),
            refreshTokens: jest.fn(),
            logout: jest.fn(),
            logoutAll: jest.fn(),
            loginWithGoogle: jest.fn(),
            forgotPassword: jest.fn(),
            resetPassword: jest.fn(),
          },
        },
      ],
    }).compile()

    controller = module.get<AuthController>(AuthController)
    authService = module.get(AuthService)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })

  describe('Registration', () => {
    it('should register with email', async () => {
      const dto: RegisterWithEmailDto = {
        email: 'test@example.com',
        password: 'Password123!',
        fullName: 'Test User',
      }
      authService.registerWithEmail.mockResolvedValueOnce({
        accessToken: 'access',
        refreshToken: 'refresh',
        expiresIn: 3600,
      })

      const result = await controller.registerWithEmail(dto, '127.0.0.1')
      expect(result.accessToken).toBe('access')
      expect(authService.registerWithEmail).toHaveBeenCalledWith(dto, '127.0.0.1')
    })
  })

  describe('Login', () => {
    it('should login with email', async () => {
      const dto: LoginWithEmailDto = { email: 'test@example.com', password: 'Password123!' }
      authService.loginWithEmail.mockResolvedValueOnce({
        accessToken: 'access',
        refreshToken: 'refresh',
        expiresIn: 3600,
      })

      const result = await controller.loginWithEmail(dto, '127.0.0.1')
      expect(result.accessToken).toBe('access')
      expect(authService.loginWithEmail).toHaveBeenCalledWith(dto, '127.0.0.1')
    })
  })

  describe('Google OAuth', () => {
    it('should login with google', async () => {
      const dto: GoogleVerifyDto = { idToken: 'google-token' }
      authService.loginWithGoogle.mockResolvedValueOnce({
        accessToken: 'access',
        refreshToken: 'refresh',
        expiresIn: 3600,
      })

      const result = await controller.loginWithGoogle(dto, '127.0.0.1')
      expect(result.accessToken).toBe('access')
      expect(authService.loginWithGoogle).toHaveBeenCalledWith('google-token', '127.0.0.1')
    })
  })

  describe('Password Reset', () => {
    it('should request forgot password', async () => {
      await controller.forgotPassword({ email: 'test@example.com' })
      expect(authService.forgotPassword).toHaveBeenCalledWith('test@example.com')
    })

    it('should reset password with otp', async () => {
      await controller.resetPassword({
        email: 'test@example.com',
        otp: '123456',
        newPassword: 'NewPassword123!',
      })
      expect(authService.resetPassword).toHaveBeenCalledWith(
        'test@example.com',
        '123456',
        'NewPassword123!',
      )
    })
  })

  describe('Logout', () => {
    it('should logout user', async () => {
      const user = { id: 'user-1' } as User
      await controller.logout(user, { refreshToken: 'refresh' }, 'Bearer access')
      expect(authService.logout).toHaveBeenCalledWith('user-1', 'refresh', 'access')
    })

    it('should logout all devices', async () => {
      const user = { id: 'user-1' } as User
      await controller.logoutAll(user)
      expect(authService.logoutAll).toHaveBeenCalledWith('user-1')
    })
  })
})
