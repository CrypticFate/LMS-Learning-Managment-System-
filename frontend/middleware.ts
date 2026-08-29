import { NextRequest, NextResponse } from 'next/server';

import { AUTH_COOKIE } from '@/lib/constants';

function hasValidSessionCookie(request: NextRequest): boolean {
  const jwt = request.cookies.get(AUTH_COOKIE)?.value;
  if (!jwt) return false;

  try {
    const payload = jwt.split('.')[1];
    if (!payload) return false;

    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const decoded = JSON.parse(atob(padded)) as { exp?: unknown };

    return typeof decoded.exp === 'number' && decoded.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

export function middleware(request: NextRequest) {
  if (hasValidSessionCookie(request)) {
    return NextResponse.next();
  }

  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('next', request.nextUrl.pathname);
  const response = NextResponse.redirect(loginUrl);
  response.cookies.delete(AUTH_COOKIE);
  return response;
}

export const config = {
  matcher: [
    '/student/:path*',
    '/instructor/:path*',
    '/content-manager/:path*',
    '/admin/:path*',
  ],
};
