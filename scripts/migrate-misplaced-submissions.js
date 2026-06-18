/**
 * Migrate misplaced submissions from Jobs Application Form → Board Recruitment template
 *
 * Background:
 *   When the SCAGO Jobs Application Form was created from the board recruitment template,
 *   some early submissions (Feb–Mar 2026) ended up stored under the wrong survey doc.
 *   They must be MOVED (copy + delete) — NOT deleted permanently.
 *
 * What this script does:
 *   1. Finds the Jobs Application Form (slug = 'board-recruitment-template')
 *   2. Finds the original board recruitment template (isTemplate = true, by title)
 *   3. Lists all submissions in the Jobs Application Form subcollection
 *   4. Copies the identified misplaced submissions to the board recruitment subcollection
 *   5. Deletes them from the Jobs Application Form subcollection
 *
 * Usage:
 *   DRY RUN (default — shows what would be moved, changes nothing):
 *     node scripts/migrate-misplaced-submissions.js
 *
 *   EXECUTE the migration:
 *     node scripts/migrate-misplaced-submissions.js --confirm
 */

const admin = require('firebase-admin');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const DRY_RUN = !process.argv.includes('--confirm');

// ─── Firebase init (same pattern as bootstrap-admin.js) ────────────────────
function initializeFirebase() {
  if (admin.apps.length > 0) return admin.app();

  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    return admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
    });
  }

  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    return admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return admin.initializeApp({ credential: admin.credential.applicationDefault() });
  }

  throw new Error(
    'Firebase credentials not found. Set one of:\n' +
    '  - FIREBASE_SERVICE_ACCOUNT\n' +
    '  - FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY\n' +
    '  - GOOGLE_APPLICATION_CREDENTIALS'
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function formatDate(ts) {
  if (!ts) return '(no date)';
  try {
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleString('en-CA', { timeZone: 'America/Toronto' });
  } catch {
    return String(ts);
  }
}

function extractName(data) {
  const candidates = [
    data['full-name'], data['fullName'], data['full_name'],
    data.name, data.applicantName,
  ];
  for (const v of candidates) {
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  const first = data['first-name'] || data.firstName || '';
  const last = data['last-name'] || data.lastName || '';
  const combined = `${first} ${last}`.trim();
  return combined || '(unnamed)';
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('┌──────────────────────────────────────────────────────────────┐');
  console.log('│  SCAGO — Migrate Misplaced Submissions                       │');
  console.log('└──────────────────────────────────────────────────────────────┘');
  console.log(DRY_RUN
    ? '\n⚠️  DRY RUN — no changes will be made. Pass --confirm to execute.\n'
    : '\n🚨 LIVE RUN — submissions WILL be moved in Firestore.\n'
  );

  initializeFirebase();
  const db = admin.firestore();

  // Confirmed survey IDs (verified by running list-surveys.js + list-all-submissions.js)
  const jobsSurveyId = 'board-recruitment-template';  // SCAGO Jobs Application Form
  const boardId = '6s91ijRpo9tQ6KHSEtbP';             // Original Board Recruitment survey (untitled)

  // Verify both docs exist
  console.log('🔍 Verifying survey documents…');
  const jobsDoc = await db.collection('surveys').doc(jobsSurveyId).get();
  if (!jobsDoc.exists) {
    console.error(`❌ Jobs Application Form not found: ${jobsSurveyId}`);
    process.exit(1);
  }
  const jobsTitle = jobsDoc.data().title || '(untitled)';
  console.log(`   ✅ Jobs Application Form: "${jobsTitle}" [${jobsSurveyId}]`);

  const boardDoc = await db.collection('surveys').doc(boardId).get();
  if (!boardDoc.exists) {
    console.error(`❌ Board Recruitment survey not found: ${boardId}`);
    process.exit(1);
  }
  const boardTitle = boardDoc.data().title || '(untitled)';
  console.log(`   ✅ Board Recruitment survey: "${boardTitle}" [${boardId}]`);

  // ── 3. List all submissions in the Jobs Application Form ─────────────────
  console.log(`\n📋 Loading submissions from "${jobsTitle}" (${jobsSurveyId})…`);
  const subSnap = await db
    .collection('surveys').doc(jobsSurveyId)
    .collection('submissions')
    .orderBy('submittedAt', 'asc')
    .get();

  console.log(`   Found ${subSnap.size} total submission(s).`);
  console.log('\n   All submissions:');
  subSnap.docs.forEach((d, i) => {
    const data = d.data();
    const name = extractName(data);
    const date = formatDate(data.submittedAt);
    console.log(`   ${i + 1}. [${d.id}] ${name} — ${date}`);
  });

  // ── 4. Identify the misplaced ones ───────────────────────────────────────
  // These are submissions that predate the Jobs Application Form's likely creation
  // (the survey was created after the board recruitment template was copied, so
  // anything from before ~April 2026 is suspect). We'll flag submissions from before
  // May 1, 2026 as candidates.
  const CUTOFF = new Date('2026-05-01T00:00:00Z');
  const candidates = subSnap.docs.filter(d => {
    const data = d.data();
    const ts = data.submittedAt;
    if (!ts) return false;
    try {
      const date = ts.toDate ? ts.toDate() : new Date(ts);
      return date < CUTOFF;
    } catch {
      return false;
    }
  });

  if (candidates.length === 0) {
    console.log('\n✅ No submissions found before May 1, 2026. Nothing to migrate.');
    process.exit(0);
  }

  console.log(`\n🚨 Found ${candidates.length} submission(s) to move (submitted before May 1, 2026):`);
  candidates.forEach((d, i) => {
    const data = d.data();
    const name = extractName(data);
    const date = formatDate(data.submittedAt);
    console.log(`   ${i + 1}. [${d.id}] ${name} — ${date}`);
  });

  console.log(`\n   FROM: surveys/${jobsSurveyId}/submissions/`);
  console.log(`   TO:   surveys/${boardId}/submissions/`);

  if (DRY_RUN) {
    console.log('\n🔒 DRY RUN complete. No changes made.');
    console.log('   Re-run with --confirm to execute the migration.');
    process.exit(0);
  }

  // ── 5. Execute: copy then delete ─────────────────────────────────────────
  console.log('\n⚙️  Executing migration…');

  for (const subDoc of candidates) {
    const id = subDoc.id;
    const data = subDoc.data();
    const name = extractName(data);

    // Copy to board recruitment subcollection (preserve the same doc ID)
    const destRef = db
      .collection('surveys').doc(boardId)
      .collection('submissions').doc(id);

    // Patch surveyId to reflect new home
    const patchedData = { ...data, surveyId: boardId, migratedFrom: jobsSurveyId, migratedAt: admin.firestore.FieldValue.serverTimestamp() };

    await destRef.set(patchedData);
    console.log(`   ✅ Copied  [${id}] ${name} → surveys/${boardId}/submissions/${id}`);

    // Delete from jobs application form
    await db
      .collection('surveys').doc(jobsSurveyId)
      .collection('submissions').doc(id)
      .delete();
    console.log(`   🗑️  Deleted [${id}] ${name} from surveys/${jobsSurveyId}/submissions/${id}`);
  }

  console.log('\n✅ Migration complete!');
  console.log(`   Moved ${candidates.length} submission(s) to the board recruitment template.`);
  console.log('   The submissions still exist in Firestore — just under the correct survey.\n');
}

main().catch(err => {
  console.error('\n❌ Fatal error:', err);
  process.exit(1);
});
