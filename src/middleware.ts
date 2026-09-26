import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, SESSION_COOKIE } from '@/lib/auth';

const PUBLIC_ROUTES = ['/login'];
const AUTH_ROUTES = ['/login'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static assets and API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next();
  }

  const sessionToken = request.cookies.get(SESSION_COOKIE)?.value;
  const session = sessionToken ? await verifyToken(sessionToken) : null;

  // Redirect root to chat or login
  if (pathname === '/') {
    if (session) {
      return NextResponse.redirect(new URL('/chat', request.url));
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // If user is authenticated and tries to access login, redirect to chat
  if (session && AUTH_ROUTES.includes(pathname)) {
    return NextResponse.redirect(new URL('/chat', request.url));
  }

  // If user is not authenticated and tries to access protected route
  if (!session && !PUBLIC_ROUTES.includes(pathname)) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
