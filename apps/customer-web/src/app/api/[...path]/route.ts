import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

const BACKEND_URL = process.env.API_URL ?? 'http://localhost:3001'

async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname.replace('/api/', '/')
  const url = `${BACKEND_URL}${path}${req.nextUrl.search}`

  const headers = new Headers()
  headers.set('Content-Type', 'application/json')

  // Forward authorization header from client
  const auth = req.headers.get('Authorization')
  if (auth) {
    headers.set('Authorization', auth)
  }

  const init: RequestInit = {
    method: req.method,
    headers,
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const body = await req.text()
    if (body) {
      init.body = body
    }
  }

  try {
    const res = await fetch(url, init)
    const data = await res.text()

    return new NextResponse(data, {
      status: res.status,
      statusText: res.statusText,
      headers: {
        'Content-Type': res.headers.get('Content-Type') ?? 'application/json',
      },
    })
  } catch {
    return NextResponse.json({ message: 'Backend unavailable' }, { status: 502 })
  }
}

export const GET = proxy
export const POST = proxy
export const PUT = proxy
export const PATCH = proxy
export const DELETE = proxy
