import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Note: Match the cookie name defined in src/lib/rbac.ts
const SESSION_COOKIE = 'qa_session';

export function middleware(request: NextRequest) {
  const session = request.cookies.get(SESSION_COOKIE);
  const { pathname } = request.nextUrl;

  // 1. Protection Guard
  // If no session exists and the user is NOT on the login page, redirect to login
  if (!session && !pathname.startsWith('/login')) {
    const loginUrl = new URL('/login', request.url);
    // Optionally preserve the intended destination
    // loginUrl.searchParams.set('from', pathname); 
    return NextResponse.redirect(loginUrl);
  }

  // 2. Authenticated Guard
  // If a session exists and the user tries to access the login page, redirect to dashboard root
  if (session && pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  /*
   * Match all request paths except for the ones starting with:
   * - api (individual API routes have their own RBAC checks)
   * - _next/static (static files)
   * - _next/image (image optimization files)
   * - favicon.ico (favicon file)
   */
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
