import { NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebase-admin';

export async function POST(request: Request) {
  try {
    // Be tolerant of empty bodies or non-JSON requests to avoid noisy logs during auth races
    let idToken: string | undefined;
    try {
      const raw = await request.text();
      if (raw && raw.trim().length > 0) {
        const parsed = JSON.parse(raw);
        idToken = parsed?.idToken;
      }
    } catch {
      // swallow JSON parse errors; will handle missing token below
    }
    if (!idToken) {
      // No-op for missing token; return 200 to avoid dev console noise
      return NextResponse.json({ success: false, skipped: true }, { status: 200 });
    }

    const auth = getAdminAuth();

    // Verify the ID token first
    const decoded = await auth.verifyIdToken(idToken);
    if (!decoded?.uid) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Create a longer-lived session cookie (e.g., 14 days)
    const expiresIn = 14 * 24 * 60 * 60 * 1000; // 14 days ms
    const sessionCookie = await auth.createSessionCookie(idToken, { expiresIn });

    const email = (decoded.email || '').toLowerCase();
    console.log('[SessionAPI] Creating session cookie for email:', email);

    const res = NextResponse.json({ success: true, email });
    const isProd = process.env.NODE_ENV === 'production';
    
    // Set session cookie with explicit domain/path to ensure it's available
    res.cookies.set('__session', sessionCookie, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: Math.floor(expiresIn / 1000),
      path: '/',
      // Don't set domain in development to allow localhost
    });

    console.log('[SessionAPI] ✅ Session cookie set');

    // Optionally set a lightweight role hint cookie for client/middleware UX (non-sensitive)
    const roleHint = (decoded as any).role || '';
    if (roleHint) {
      res.cookies.set('app_role', String(roleHint), {
        httpOnly: false,
        secure: isProd,
        sameSite: 'lax',
        maxAge: Math.floor(expiresIn / 1000),
        path: '/',
      });
    }

    return res;
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
  }
}


