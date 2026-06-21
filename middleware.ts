import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const protectedPaths = ['/dashboard', '/friends', '/analytics', '/settings', '/profile', '/u'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));
  if (!isProtected) return NextResponse.next();

  const token = req.cookies.get('addawah-session')?.value;
  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  const response = NextResponse.next();
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  return response;
}

export const config = {
  matcher: ['/dashboard/:path*', '/friends/:path*', '/analytics/:path*', '/settings/:path*', '/profile/:path*', '/u/:path*'],
};
