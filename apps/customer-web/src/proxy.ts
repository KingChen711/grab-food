import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

const PROTECTED_PATHS = ['/profile', '/orders', '/checkout', '/favorites', '/account']
const AUTH_PATHS = ['/login', '/register', '/forgot-password']

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isAuth = !!request.cookies.get('access_token')?.value

  if (PROTECTED_PATHS.some((p) => pathname.startsWith(p)) && !isAuth) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  if (AUTH_PATHS.some((p) => pathname === p) && isAuth) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const proxyConfig = {
  matcher: [
    '/profile/:path*',
    '/orders/:path*',
    '/checkout/:path*',
    '/favorites/:path*',
    '/account/:path*',
    '/login',
    '/register',
    '/forgot-password',
  ],
}
