import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { decodeJwt } from 'jose';

const protectedPaths = ['/dashboard', '/friends', '/analytics', '/settings', '/profile', '/notifications', '/u', '/ruhaniah'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));
  if (!isProtected) return NextResponse.next();

  const token = req.cookies.get('addawah-session')?.value;
  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Verify JWT expiry without DB call — CPU only
  try {
    const payload = decodeJwt(token);
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      const response = NextResponse.redirect(new URL('/login', req.url));
      response.cookies.set('addawah-session', '', { httpOnly: true, expires: new Date(0), path: '/' });
      return response;
    }
  } catch {
    // Malformed token — let the API route handle it (same as before)
  }

  const response = NextResponse.next();
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  return response;
}

export const config = {
  matcher: [
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
