import type { INestApplication } from '@nestjs/common'
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing'
import request from 'supertest'

import { AppModule } from '../src/app.module'

describe('Auth & Users (e2e)', () => {
  let app: INestApplication
  let accessToken: string
  const uniqueId = Date.now()
  const testUser = {
    email: `testuser_${uniqueId}@example.com`,
    password: 'Password123!',
    fullName: 'Test User E2E',
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication()
    // Normally you'd apply validation pipes here as in main.ts if you want full parity
    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  it('/auth/register/email (POST)', async () => {
    const res = await request(app.getHttpServer()).post('/auth/register/email').send(testUser)

    if (res.status !== 201) console.error('Register Error:', res.body)
    expect(res.status).toBe(201)
    expect(res.body.data.accessToken).toBeDefined()
    expect(res.body.data.refreshToken).toBeDefined()
    accessToken = res.body.data.accessToken
  })

  it('/auth/login/email (POST)', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login/email')
      .send({ email: testUser.email, password: testUser.password })

    if (res.status !== 200) console.error('Login Error:', res.body)
    expect(res.status).toBe(200)
    expect(res.body.data.accessToken).toBeDefined()
    expect(res.body.data.refreshToken).toBeDefined()
  })

  it('/users/me (GET)', async () => {
    const res = await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', `Bearer ${accessToken}`)

    if (res.status !== 200) console.error('Get User Error:', res.body)
    expect(res.status).toBe(200)
    expect(res.body.data.fullName).toEqual(testUser.fullName)
  })
})
