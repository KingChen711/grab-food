import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

const SERVICE_ROUTES: { prefix: string; url: string }[] = [
  { prefix: '/search', url: process.env.SEARCH_SERVICE_URL ?? 'http://localhost:3007' },
  { prefix: '/uploads', url: process.env.MEDIA_SERVICE_URL ?? 'http://localhost:3010' },
  { prefix: '/restaurants', url: process.env.RESTAURANT_SERVICE_URL ?? 'http://localhost:3002' },
]
const DEFAULT_URL = process.env.API_URL ?? 'http://localhost:3001'

function resolveBackendUrl(path: string): string {
  for (const { prefix, url } of SERVICE_ROUTES) {
    if (path.startsWith(prefix)) return url
  }
  return DEFAULT_URL
}

async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname.replace('/api/', '/')
  const backendUrl = resolveBackendUrl(path)
  const url = `${backendUrl}${path}${req.nextUrl.search}`

  const headers = new Headers()
  headers.set('Content-Type', 'application/json')

  const token = req.cookies.get('access_token')?.value
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const init: RequestInit = { method: req.method, headers }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const body = await req.text()
    if (body) init.body = body
  }

  try {
    const res = await fetch(url, init)
    const isNullBody = res.status === 204 || res.status === 205 || res.status === 304
    const data = isNullBody ? null : await res.text()

    console.log(`[proxy] ${req.method} ${url} → ${res.status}`)
    if (!res.ok) console.error(`[proxy] error body:`, data)

    return new NextResponse(data, {
      status: res.status,
      statusText: res.statusText,
      headers: { 'Content-Type': res.headers.get('Content-Type') ?? 'application/json' },
    })
  } catch (err) {
    console.error(`[proxy] ${req.method} ${url} failed:`, err)
    return NextResponse.json({ message: 'Backend unavailable' }, { status: 502 })
  }
}

export const GET = proxy
export const POST = proxy
export const PUT = proxy
export const PATCH = proxy
export const DELETE = proxy
