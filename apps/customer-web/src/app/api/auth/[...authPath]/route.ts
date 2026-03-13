import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

const BACKEND_URL = process.env.API_URL ?? 'http://localhost:3001'
const IS_PROD = process.env.NODE_ENV === 'production'

const COOKIE_BASE = {
  httpOnly: true,
  secure: IS_PROD,
  sameSite: 'strict' as const,
  path: '/',
}

// Routes where backend returns tokens → we intercept and set httpOnly cookies
const TOKEN_ISSUING_PATHS = new Set([
  '/auth/login/email',
  '/auth/login/phone',
  '/auth/register/email',
  '/auth/register/phone',
  '/auth/google/verify',
])

function getBackendPath(req: NextRequest): string {
  // /api/auth/login/email → /auth/login/email
  return req.nextUrl.pathname.replace('/api/auth', '/auth')
}

async function handler(req: NextRequest): Promise<NextResponse> {
  const backendPath = getBackendPath(req)
  const url = `${BACKEND_URL}${backendPath}${req.nextUrl.search}`

  const headers = new Headers()
  headers.set('Content-Type', 'application/json')

  try {
    // ── Token-issuing routes (login, register, google) ──────────────────────
    if (req.method === 'POST' && TOKEN_ISSUING_PATHS.has(backendPath)) {
      const body = await req.text()
      const res = await fetch(url, { method: 'POST', headers, body })
      const json = await res.json()

      if (!res.ok) {
        return NextResponse.json(json, { status: res.status })
      }

      // Unwrap TransformInterceptor envelope: { success, data: { accessToken, ... }, timestamp }
      const tokens = json.data ?? json
      const response = NextResponse.json({ success: true }, { status: res.status })
      response.cookies.set('access_token', tokens.accessToken, {
        ...COOKIE_BASE,
        maxAge: tokens.expiresIn ?? 60 * 15,
      })
      response.cookies.set('refresh_token', tokens.refreshToken, {
        ...COOKIE_BASE,
        maxAge: 60 * 60 * 24 * 7,
      })
      return response
    }

    // ── Refresh ─────────────────────────────────────────────────────────────
    if (req.method === 'POST' && backendPath === '/auth/refresh') {
      const refreshToken = req.cookies.get('refresh_token')?.value
      if (!refreshToken) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
      }

      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ refreshToken }),
      })
      const json = await res.json()

      if (!res.ok) {
        const response = NextResponse.json(json, { status: res.status })
        response.cookies.delete('access_token')
        response.cookies.delete('refresh_token')
        return response
      }

      // Unwrap TransformInterceptor envelope
      const tokens = json.data ?? json
      const response = NextResponse.json({ success: true })
      response.cookies.set('access_token', tokens.accessToken, {
        ...COOKIE_BASE,
        maxAge: tokens.expiresIn ?? 60 * 15,
      })
      response.cookies.set('refresh_token', tokens.refreshToken, {
        ...COOKIE_BASE,
        maxAge: 60 * 60 * 24 * 7,
      })
      return response
    }

    // ── Logout ──────────────────────────────────────────────────────────────
    if (req.method === 'POST' && backendPath === '/auth/logout') {
      const refreshToken = req.cookies.get('refresh_token')?.value
      await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ refreshToken }),
      }).catch(() => {})

      const response = NextResponse.json({ success: true })
      response.cookies.delete('access_token')
      response.cookies.delete('refresh_token')
      return response
    }

    // ── Other auth routes (forgot-password, reset-password, otp, etc.) ──────
    const init: RequestInit = { method: req.method, headers }
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      const body = await req.text()
      if (body) init.body = body
    }

    const res = await fetch(url, init)
    const isNullBody = res.status === 204 || res.status === 205 || res.status === 304
    const data = isNullBody ? null : await res.text()
    return new NextResponse(data, {
      status: res.status,
      statusText: res.statusText,
      headers: { 'Content-Type': res.headers.get('Content-Type') ?? 'application/json' },
    })
  } catch (err) {
    console.error(`[auth proxy] ${req.method} ${url} failed:`, err)
    return NextResponse.json({ message: 'Backend unavailable' }, { status: 502 })
  }
}

export const GET = handler
export const POST = handler
export const PUT = handler
export const PATCH = handler
export const DELETE = handler
