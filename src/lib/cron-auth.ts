import { createHash, timingSafeEqual } from 'crypto';

/**
 * Shared secret for scheduled jobs calling into the app.
 *
 * Uses CRON_SECRET when set. Otherwise it is derived from the Firebase
 * service-account key, which the scheduled function and the app already share
 * as Netlify environment variables — so scheduled jobs work without anyone
 * having to create and copy a new secret. The derivation must stay identical
 * to netlify/functions/case-digest.mjs.
 */
export function expectedCronToken(): string | null {
  if (process.env.CRON_SECRET) return process.env.CRON_SECRET;
  const email = process.env.FIREBASE_CLIENT_EMAIL;
  const key = process.env.FIREBASE_PRIVATE_KEY;
  if (!email || !key) return null;
  return createHash('sha256').update(`scago-cron:${email}:${key}`).digest('hex');
}

/** Constant-time check of a `Bearer <token>` Authorization header. */
export function isAuthorizedCronRequest(authorizationHeader: string | null): boolean {
  const expected = expectedCronToken();
  if (!expected || !authorizationHeader?.startsWith('Bearer ')) return false;
  const given = Buffer.from(authorizationHeader.slice('Bearer '.length));
  const want = Buffer.from(expected);
  return given.length === want.length && timingSafeEqual(given, want);
}
