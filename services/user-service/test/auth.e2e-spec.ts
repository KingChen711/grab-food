import type { INestApplication } from '@nestjs/common'
import { ValidationPipe } from '@nestjs/common'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import request from 'supertest'

import { AppModule } from '../src/app.module'
import { TokenBlacklistService } from '../src/auth/token-blacklist/token-blacklist.service'

describe('Auth & Users (e2e)', () => {
  let app: INestApplication
  let tokenBlacklistService: TokenBlacklistService

  const uniqueId = Date.now()
  const testUser = {
    email: `testuser_${uniqueId}@example.com`,
    password: 'Password123!',
    fullName: 'Test User E2E',
  }
  let accessToken: string

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication()
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))
    await app.init()

    tokenBlacklistService = app.get(TokenBlacklistService)
  })

  afterAll(async () => {
    await app.close()
  })

  // ─── Basic Auth ──────────────────────────────────────────────────────────

  describe('Registration & Login', () => {
    it('POST /auth/register/email — should register a new user', async () => {
      const res = await request(app.getHttpServer()).post('/auth/register/email').send(testUser)

      expect(res.status).toBe(201)
      expect(res.body.data.accessToken).toBeDefined()
      expect(res.body.data.refreshToken).toBeDefined()
      expect(res.body.data.expiresIn).toBeDefined()
      accessToken = res.body.data.accessToken
    })

    it('POST /auth/register/email — should reject duplicate email', async () => {
      const res = await request(app.getHttpServer()).post('/auth/register/email').send(testUser)

      expect(res.status).toBe(409)
    })

    it('POST /auth/login/email — should login with correct credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login/email')
        .send({ email: testUser.email, password: testUser.password })

      expect(res.status).toBe(200)
      expect(res.body.data.accessToken).toBeDefined()
      expect(res.body.data.refreshToken).toBeDefined()
      // Update tokens for subsequent tests
      accessToken = res.body.data.accessToken
    })

    it('POST /auth/login/email — should reject wrong password', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login/email')
        .send({ email: testUser.email, password: 'WrongPassword!' })

      expect(res.status).toBe(401)
    })

    it('GET /users/me — should return current user', async () => {
      const res = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${accessToken}`)

      expect(res.status).toBe(200)
      expect(res.body.data.email).toEqual(testUser.email)
    })

    it('GET /users/me — should reject without token', async () => {
      const res = await request(app.getHttpServer()).get('/users/me')

      expect(res.status).toBe(401)
    })
  })

  // ─── Refresh Token Rotation ──────────────────────────────────────────────

  describe('Refresh Token Rotation', () => {
    let originalRefreshToken: string
    let newAccessToken: string
    let newRefreshToken: string

    beforeAll(async () => {
      // Login to get a fresh token pair
      const res = await request(app.getHttpServer())
        .post('/auth/login/email')
        .send({ email: testUser.email, password: testUser.password })

      originalRefreshToken = res.body.data.refreshToken
    })

    it('POST /auth/refresh — should rotate tokens', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: originalRefreshToken })

      expect(res.status).toBe(200)
      expect(res.body.data.accessToken).toBeDefined()
      expect(res.body.data.refreshToken).toBeDefined()
      expect(res.body.data.refreshToken).not.toBe(originalRefreshToken)
      newAccessToken = res.body.data.accessToken
      newRefreshToken = res.body.data.refreshToken
    })

    it('POST /auth/refresh — should reject reused (old) refresh token', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: originalRefreshToken })

      expect(res.status).toBe(403)
    })

    it('new access token should still work (stateless JWT)', async () => {
      const res = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${newAccessToken}`)

      expect(res.status).toBe(200)
    })

    it('new refresh token should be revoked after family revocation', async () => {
      // The entire family was revoked when we reused the old token above
      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: newRefreshToken })

      // Should fail because family was revoked
      expect([401, 403]).toContain(res.status)
    })
  })

  // ─── Logout ──────────────────────────────────────────────────────────────

  describe('Logout', () => {
    let sessionAccessToken: string
    let sessionRefreshToken: string

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login/email')
        .send({ email: testUser.email, password: testUser.password })

      sessionAccessToken = res.body.data.accessToken
      sessionRefreshToken = res.body.data.refreshToken
    })

    it('POST /auth/logout — should revoke the refresh token', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${sessionAccessToken}`)
        .send({ refreshToken: sessionRefreshToken })

      expect(res.status).toBe(204)
    })

    it('POST /auth/refresh — revoked refresh token should be rejected', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: sessionRefreshToken })

      expect([401, 403]).toContain(res.status)
    })
  })

  // ─── Logout All ──────────────────────────────────────────────────────────

  describe('Logout All', () => {
    let session1AccessToken: string
    let session1RefreshToken: string
    let session2RefreshToken: string

    beforeAll(async () => {
      // Create two sessions
      const res1 = await request(app.getHttpServer())
        .post('/auth/login/email')
        .send({ email: testUser.email, password: testUser.password })

      session1AccessToken = res1.body.data.accessToken
      session1RefreshToken = res1.body.data.refreshToken

      const res2 = await request(app.getHttpServer())
        .post('/auth/login/email')
        .send({ email: testUser.email, password: testUser.password })

      session2RefreshToken = res2.body.data.refreshToken
    })

    it('POST /auth/logout-all — should revoke all sessions', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/logout-all')
        .set('Authorization', `Bearer ${session1AccessToken}`)

      expect(res.status).toBe(204)
    })

    it('both refresh tokens should be rejected after logout-all', async () => {
      const res1 = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: session1RefreshToken })

      const res2 = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: session2RefreshToken })

      expect([401, 403]).toContain(res1.status)
      expect([401, 403]).toContain(res2.status)
    })
  })

  // ─── Password Reset ──────────────────────────────────────────────────────

  describe('Password Reset', () => {
    const newPassword = 'NewSecurePass456!'

    it('POST /auth/forgot-password — should accept (always 204)', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: testUser.email })

      expect(res.status).toBe(204)
    })

    it('POST /auth/reset-password — should reset with valid OTP from Redis', async () => {
      // Read the OTP directly from Redis
      const otp = await tokenBlacklistService.getRaw(`otp:email:${testUser.email}`)
      expect(otp).toBeDefined()
      expect(otp).toHaveLength(6)

      const res = await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({ email: testUser.email, otp, newPassword })

      expect(res.status).toBe(204)
    })

    it('should fail login with old password after reset', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login/email')
        .send({ email: testUser.email, password: testUser.password })

      expect(res.status).toBe(401)
    })

    it('should succeed login with new password', async () => {
      // resetPassword above called blacklistAllForUser, which records a revoke
      // timestamp at 1-second granularity. A token issued in that same second is
      // treated as revoked (iat <= revokeTimestamp), so wait past the second
      // boundary to guarantee the fresh token's iat is strictly greater.
      await new Promise((resolve) => setTimeout(resolve, 1100))

      const res = await request(app.getHttpServer())
        .post('/auth/login/email')
        .send({ email: testUser.email, password: newPassword })

      expect(res.status).toBe(200)
      expect(res.body.data.accessToken).toBeDefined()
      // Update for subsequent tests
      accessToken = res.body.data.accessToken
    })
  })

  // ─── Profile Update ──────────────────────────────────────────────────────

  describe('Profile Update', () => {
    it('PATCH /users/me — should update profile', async () => {
      const res = await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ fullName: 'Updated Name E2E' })

      expect(res.status).toBe(204)
    })

    it('GET /users/me — should reflect updated profile', async () => {
      const res = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${accessToken}`)

      expect(res.status).toBe(200)
      expect(res.body.data.profile.fullName).toBe('Updated Name E2E')
    })
  })

  // ─── Address CRUD ────────────────────────────────────────────────────────

  describe('Address CRUD', () => {
    let addressId: string

    it('POST /users/me/addresses — should create an address', async () => {
      const res = await request(app.getHttpServer())
        .post('/users/me/addresses')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          fullAddress: '123 Nguyen Hue, Quan 1, TP HCM',
          label: 'Home',
          city: 'Ho Chi Minh City',
          lat: 10.7731,
          lng: 106.7025,
        })

      expect(res.status).toBe(201)
      expect(res.body.data.id).toBeDefined()
      expect(res.body.data.isDefault).toBe(true) // First address auto-default
      addressId = res.body.data.id
    })

    it('GET /users/me/addresses — should list addresses', async () => {
      const res = await request(app.getHttpServer())
        .get('/users/me/addresses')
        .set('Authorization', `Bearer ${accessToken}`)

      expect(res.status).toBe(200)
      expect(res.body.data).toHaveLength(1)
      expect(res.body.data[0].label).toBe('Home')
    })

    it('PATCH /users/me/addresses/:id — should update address', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/users/me/addresses/${addressId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ label: 'Office' })

      expect(res.status).toBe(204)
    })

    it('POST /users/me/addresses — should create second address', async () => {
      const res = await request(app.getHttpServer())
        .post('/users/me/addresses')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          fullAddress: '456 Le Loi, Quan 1, TP HCM',
          label: 'Work',
          city: 'Ho Chi Minh City',
          lat: 10.7756,
          lng: 106.7019,
        })

      expect(res.status).toBe(201)
    })

    it('PATCH /users/me/addresses/:id/default — should set default', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/users/me/addresses/${addressId}/default`)
        .set('Authorization', `Bearer ${accessToken}`)

      expect(res.status).toBe(204)
    })

    it('DELETE /users/me/addresses/:id — should delete address', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/users/me/addresses/${addressId}`)
        .set('Authorization', `Bearer ${accessToken}`)

      expect(res.status).toBe(204)
    })

    it('GET /users/me/addresses — should have one address remaining', async () => {
      const res = await request(app.getHttpServer())
        .get('/users/me/addresses')
        .set('Authorization', `Bearer ${accessToken}`)

      expect(res.status).toBe(200)
      expect(res.body.data).toHaveLength(1)
      expect(res.body.data[0].label).toBe('Work')
    })
  })
})
