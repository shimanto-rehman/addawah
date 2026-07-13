import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { decodeJwt } from 'jose';

const protectedPaths = [
  '/dashboard',
  '/friends',
  '/analytics',
  '/settings',
  '/profile',
  '/notifications',
  '/u',
  '/ruhaniah',
  '/in',
];

/** Expiry-only JWT check — no DB. Used for Truth shell rewrite + protected gates. */
function sessionLooksValid(token: string): boolean {
  try {
    const payload = decodeJwt(token);
    if (payload.exp && payload.exp * 1000 < Date.now()) return false;
    return true;
  } catch {
    return false;
  }
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get('addawah-session')?.value;

  // Same /truth URL: guests → public shell (video); signed-in → app shell rewrite.
  if (pathname === '/truth') {
    if (token && sessionLooksValid(token)) {
      const url = req.nextUrl.clone();
      url.pathname = '/in/truth';
      const response = NextResponse.rewrite(url);
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      response.headers.set('Pragma', 'no-cache');
      response.headers.set('Expires', '0');
      return response;
    }
    return NextResponse.next();
  }

  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));
  if (!isProtected) return NextResponse.next();

  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  if (!sessionLooksValid(token)) {
    const response = NextResponse.redirect(new URL('/login', req.url));
    response.cookies.set('addawah-session', '', { httpOnly: true, expires: new Date(0), path: '/' });
    return response;
  }

  const response = NextResponse.next();
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  return response;
}

export const config = {
  matcher: [
    '/truth',
    '/in/:path*',
    '/dashboard/:path*',
    '/friends/:path*',
    '/analytics/:path*',
    '/settings/:path*',
    '/profile/:path*',
    '/notifications/:path*',
    '/u/:path*',
    '/ruhaniah/:path*',
  ],
};
