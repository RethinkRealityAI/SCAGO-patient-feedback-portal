import { NextRequest, NextResponse } from 'next/server';

const PROTECTED_PREFIXES = [
  '/admin',
  '/dashboard',
  '/editor',
  '/patients',
  '/profile',
  '/youth-empowerment',
  '/yep-forms',
];

function isProtectedPath(pathname: string) {
  return PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  const hasSessionCookie = Boolean(request.cookies.get('__session')?.value);
  if (hasSessionCookie) {
    return NextResponse.next();
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = '/login';
  loginUrl.searchParams.set('redirect', `${pathname}${search}`);

  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
