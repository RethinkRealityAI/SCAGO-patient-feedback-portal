/**
 * Netlify scheduled function: every Monday at 9:00 a.m. Toronto time, ask the
 * app to send the weekly case digest (src/app/api/cron/case-digest/route.ts).
 *
 * The schedule is in UTC. 13:00 UTC is 9:00 a.m. EDT (summer) and 8:00 a.m.
 * EST (winter) — close enough for a weekly summary, and never during the
 * previous evening.
 *
 * The token derivation must stay identical to src/lib/cron-auth.ts.
 */
import { createHash } from 'node:crypto';

function cronToken() {
  if (process.env.CRON_SECRET) return process.env.CRON_SECRET;
  const email = process.env.FIREBASE_CLIENT_EMAIL;
  const key = process.env.FIREBASE_PRIVATE_KEY;
  if (!email || !key) return null;
  return createHash('sha256').update(`scago-cron:${email}:${key}`).digest('hex');
}

export default async () => {
  const token = cronToken();
  const base = process.env.URL; // set by Netlify to the site's primary URL
  if (!token || !base) {
    console.error('[case-digest] Missing token inputs or site URL; skipping.');
    return new Response('not configured', { status: 500 });
  }

  const response = await fetch(`${base}/api/cron/case-digest`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await response.text();
  console.log(`[case-digest] ${response.status} ${body.slice(0, 2000)}`);
  return new Response(body, { status: response.status });
};

export const config = {
  schedule: '0 13 * * 1',
};
