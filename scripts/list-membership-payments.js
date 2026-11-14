/**
 * List membership form payments (read-only)
 *
 * Prints every SCAGO Membership Registration submission in a date range with
 * the member's name, email, plan, amount and PayPal transaction ID, so payments
 * that show up without a name in PayPal can be matched to a person.
 *
 * Why this exists: between the PayPal v6 migration (2026-04-10) and the payer
 * identity fix (2026-05-25), card / Google Pay / Apple Pay payments made through
 * the form were sent to PayPal without the payer's name, so they appear blank in
 * the PayPal activity export. The form itself still recorded who paid.
 *
 * Usage:
 *   node scripts/list-membership-payments.js                      # all submissions
 *   node scripts/list-membership-payments.js 2026-04-20 2026-05-31
 *   node scripts/list-membership-payments.js 2026-04-20 2026-05-31 --csv > payments.csv
 *
 * Needs Firebase Admin credentials in .env.local (same as bootstrap-admin.js):
 *   FIREBASE_SERVICE_ACCOUNT, or FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL +
 *   FIREBASE_PRIVATE_KEY (or FIREBASE_PRIVATE_KEY_BASE64), or
 *   GOOGLE_APPLICATION_CREDENTIALS.
 *
 * This script never writes to Firestore.
 */

const admin = require('firebase-admin');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const MEMBERSHIP_SURVEY_ID = 'scago-membership-registration';
const PAYMENT_FIELD_ID = 'membershipPayment';

function initializeFirebase() {
  if (admin.apps.length > 0) return admin.app();

  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    return admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
    });
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    : process.env.FIREBASE_PRIVATE_KEY_BASE64
      ? Buffer.from(process.env.FIREBASE_PRIVATE_KEY_BASE64, 'base64').toString('utf8')
      : undefined;

  if (projectId && clientEmail && privateKey) {
    return admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
    });
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return admin.initializeApp({ credential: admin.credential.applicationDefault() });
  }

  throw new Error(
    'Firebase Admin credentials not found. Set FIREBASE_SERVICE_ACCOUNT, ' +
      'FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY, ' +
      'or GOOGLE_APPLICATION_CREDENTIALS in .env.local.',
  );
}

function toDate(value) {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate();
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseDayArg(arg, endOfDay) {
  if (!arg) return null;
  const d = new Date(`${arg}T${endOfDay ? '23:59:59.999' : '00:00:00'}`);
  if (Number.isNaN(d.getTime())) throw new Error(`Invalid date "${arg}". Use YYYY-MM-DD.`);
  return d;
}

function csvCell(value) {
  const s = value == null ? '' : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

async function main() {
  const args = process.argv.slice(2);
  const asCsv = args.includes('--csv');
  const [fromArg, toArg] = args.filter((a) => !a.startsWith('--'));
  const from = parseDayArg(fromArg, false);
  const to = parseDayArg(toArg, true);

  initializeFirebase();
  const db = admin.firestore();

  let query = db.collection('surveys').doc(MEMBERSHIP_SURVEY_ID).collection('submissions');
  if (from) query = query.where('submittedAt', '>=', from);
  if (to) query = query.where('submittedAt', '<=', to);

  const snapshot = await query.get();

  const rows = snapshot.docs
    .map((doc) => {
      const data = doc.data();
      const payment = data[PAYMENT_FIELD_ID] || {};
      const verified = Array.isArray(data.paymentVerification)
        ? data.paymentVerification.find((v) => v.fieldId === PAYMENT_FIELD_ID)
        : undefined;
      const submittedAt = toDate(data.submittedAt);
      return {
        submittedAt,
        date: submittedAt ? submittedAt.toLocaleDateString('en-GB', { timeZone: 'America/Toronto' }) : '',
        name: [data.firstName, data.lastName].filter(Boolean).join(' ').trim(),
        email: data.email || '',
        phone: data.phone || '',
        plan: payment.plan || payment.planId || '',
        amount: payment.amount ?? payment.total ?? verified?.amount ?? '',
        transactionId: payment.transactionId || verified?.captureId || '',
        paidAt: payment.paidAt || '',
        submissionId: doc.id,
      };
    })
    .sort((a, b) => (a.submittedAt?.getTime() || 0) - (b.submittedAt?.getTime() || 0));

  const columns = ['date', 'name', 'email', 'phone', 'plan', 'amount', 'transactionId', 'paidAt', 'submissionId'];

  if (asCsv) {
    console.log(columns.join(','));
    for (const row of rows) console.log(columns.map((c) => csvCell(row[c])).join(','));
    return;
  }

  console.log(`\nMembership submissions found: ${rows.length}\n`);
  console.table(rows.map(({ submittedAt, ...rest }) => rest));
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(`\n${err.message || err}`);
    process.exit(1);
  });
