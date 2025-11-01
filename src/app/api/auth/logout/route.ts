import { NextResponse } from 'next/server';

export async function POST() {
  const res = NextResponse.json({ success: true });
  const isProd = process.env.NODE_ENV === 'production';
  res.cookies.set('__session', '', {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });
  res.cookies.set('app_role', '', {
    httpOnly: false,
    secure: isProd,
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });
  return res;
}


