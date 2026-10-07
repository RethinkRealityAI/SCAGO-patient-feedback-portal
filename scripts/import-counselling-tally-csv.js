/**
 * Import past Counselling Intake submissions exported from Tally into the
 * portal's `counselling-intake` form, so the dashboard has the full history.
 *
 *   node scripts/import-counselling-tally-csv.js "<path to Tally CSV>"            # dry run
 *   node scripts/import-counselling-tally-csv.js "<path to Tally CSV>" --confirm  # write
 *
 * - Writes with the Admin SDK only: no staff or applicant emails are sent.
 * - Each row becomes surveys/counselling-intake/submissions/tally-<Tally ID>,
 *   so re-running skips rows already imported (and never overwrites case
 *   status, assignee or notes added since).
 * - Answers are mapped onto the new form's fields and option wording. The old
 *   form's single "City & Postal Code" box is split where possible.
 * - Requests received before CLOSE_BEFORE are imported as Closed (they were
 *   handled outside the portal); later ones start as Awaiting contact so staff
 *   can triage them. Every imported case gets a note saying where it came from.
 */
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const SURVEY_ID = 'counselling-intake';
const CLOSE_BEFORE = new Date('2026-09-01T00:00:00Z');
const csvPath = process.argv.find((a, i) => i >= 2 && !a.startsWith('--'));
const DRY_RUN = !process.argv.includes('--confirm');

if (!csvPath) {
  console.error('Usage: node scripts/import-counselling-tally-csv.js "<csv path>" [--confirm]');
  process.exit(1);
}

function initializeFirebase() {
  if (admin.apps.length > 0) return admin.app();
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    return admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
  }
  return admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });
}

// ─── CSV ─────────────────────────────────────────────────────────────────────
function parseCsv(text) {
  const rows = [];
  let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some(v => v !== '')) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some(v => v !== '')) rows.push(row);
  return rows;
}

// ─── Answer mapping ──────────────────────────────────────────────────────────
const clean = v => (v || '').replace(/\s+/g, ' ').trim();

const SEEKING_FOR = { 'You': 'Myself', 'A Family member': 'A family member', 'Someone else?': 'Someone else' };

const ABOUT_YOU = [
  'I am an individual with sickle cell disease',
  'I am a parent or family member of a person with sickle cell disease',
];

const AGE_GROUP = {
  'Child (under 12 years of age)': 'Child (12 years or younger)',
  'Teen (13 to 17 years of age)': 'Teen (13 to 17 years)',
  'Adult (18 to 59 years)': 'Adult (18 to 59 years)',
  'Senior (60 years or older)': 'Senior (60 years or older)',
};

const COUNSELLING = [
  'Healthy coping skill development (e.g., stress management)', // first: contains ", "
  'Connection to community resources',
  'Personal or Family Support',
  'Grief and Loss',
  'Food, housing, or income security',
  'Poor quality of care received in an Ontario hospital',
];

/**
 * Split a Tally multi-select cell. Option labels can themselves contain ", ",
 * so known options are matched first and whatever is left is free text.
 */
function splitChoices(cell, known) {
  let rest = `, ${clean(cell)}, `;
  const found = [];
  for (const option of known) {
    const needle = `, ${option}, `;
    if (rest.includes(needle)) {
      found.push(option);
      rest = rest.replace(needle, ', ');
    }
  }
  const leftover = rest.split(', ').map(clean).filter(Boolean);
  return { found, leftover };
}

// Ontario city list as stored by the form's city field: { selection: <value> }.
const CITIES = (() => {
  const src = fs.readFileSync(path.join(__dirname, '../src/lib/location-data.ts'), 'utf8');
  const start = src.indexOf('export const ontarioCities');
  return [...src.slice(start).matchAll(/\{\s*label:\s*'([^']+)',\s*value:\s*'([^']+)'\s*\}/g)]
    .map(m => ({ label: m[1], value: m[2] }))
    .filter(c => c.value !== 'other')
    .sort((a, b) => b.label.length - a.label.length);
})();
// Neighbourhoods people write instead of the city.
const CITY_ALIASES = { 'north york': 'toronto', 'east york': 'toronto', 'etobicoke': 'toronto', 'scarborough': 'toronto', 'orleans': 'ottawa' };

const POSTAL = /\b([A-Za-z]\d[A-Za-z])\s?(\d[A-Za-z]\d)\b/;

function splitLocation(raw) {
  const text = clean(raw);
  const postal = text.match(POSTAL);
  const postalCode = postal ? `${postal[1]} ${postal[2]}`.toUpperCase() : undefined;
  const lower = text.toLowerCase();

  for (const [alias, value] of Object.entries(CITY_ALIASES)) {
    if (lower.includes(alias)) return { city: { selection: value }, postalCode };
  }
  for (const c of CITIES) {
    if (new RegExp(`\\b${c.label.toLowerCase().replace(/[.]/g, '\\.')}\\b`).test(lower)) {
      return { city: { selection: c.value }, postalCode };
    }
  }
  // Not an Ontario city we list (or only a postal code): keep what they wrote.
  const other = clean(text.replace(POSTAL, '').replace(/[,\s]+$/, '').replace(/^[,\s]+/, ''));
  // A bare street address or placeholder isn't a city; it stays in the case note.
  const usable = other && !/^\d/.test(other);
  return { city: usable ? { selection: 'other', other } : undefined, postalCode };
}

/** Tally exports times in UTC as "YYYY-MM-DD HH:MM:SS". */
const parseTallyDate = s => new Date(`${clean(s).replace(' ', 'T')}Z`);

function toSubmission(rec) {
  const notes = [];
  const seeking = SEEKING_FOR[clean(rec.seeking)] || clean(rec.seeking);
  const { city, postalCode } = splitLocation(rec.location);

  const about = splitChoices(rec.aboutYou, ABOUT_YOU);
  const counselling = splitChoices(rec.counselling, COUNSELLING);
  const counsellingOther = counselling.leftover.filter(v => v !== 'Other');
  const counsellingType = [...counselling.found];
  if (counselling.leftover.length) counsellingType.push('Other');

  // The new form takes one age group; the old one allowed several.
  const ages = splitChoices(rec.ageGroup, Object.keys(AGE_GROUP)).found.map(a => AGE_GROUP[a]);
  if (ages.length > 1) notes.push(`Original age groups: ${ages.join('; ')}.`);

  const data = {
    firstName: clean(rec.firstName),
    lastName: clean(rec.lastName),
    primaryPhone: clean(rec.phone),
    email: clean(rec.email),
    seekingServicesFor: seeking,
    aboutYou: about.found,
    ageGroup: ages[0],
    counsellingType,
    verifyInformation: rec.verify === 'true',
    agreeTerms: rec.agree === 'true',
    surveyId: SURVEY_ID,
    submittedAt: parseTallyDate(rec.submittedAt),
    importedFrom: 'tally',
    tallySubmissionId: rec.id,
  };
  const alt = clean(rec.altPhone);
  if (alt && alt !== data.primaryPhone) data.alternatePhone = alt;
  if (city) data.city = city;
  if (postalCode) data.postalCode = postalCode;
  // Only asked when the request is for someone else, as on the new form.
  if (seeking !== 'Myself' && ['Yes', 'No'].includes(clean(rec.aware))) data.othersAware = clean(rec.aware);
  if (about.leftover.length) {
    data.aboutYou.push('Other');
    data.aboutYou_otherValue = about.leftover.join(', ');
  }
  if (counsellingOther.length) data.counsellingType_otherValue = counsellingOther.join(', ');
  if (clean(rec.location) && !(city && city.selection !== 'other' && postalCode)) {
    notes.push(`Location as entered: ${clean(rec.location)}.`);
  }

  const closed = data.submittedAt < CLOSE_BEFORE;
  data.caseStatus = closed ? 'closed' : 'new';
  if (closed) data.reviewed = true;
  data.caseNotes = [{
    text: [
      `Imported from the previous Tally form (submission ${rec.id}).`,
      closed ? 'Received before the portal; marked Closed on import. Reopen if still active.' : '',
      ...notes,
    ].filter(Boolean).join(' '),
    author: 'Tally import',
    at: new Date().toISOString(),
  }];
  return data;
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  const rows = parseCsv(fs.readFileSync(csvPath, 'utf8').replace(/^﻿/, ''));
  const header = rows.shift().map(clean);
  const col = name => {
    const i = header.findIndex(h => h.startsWith(name));
    if (i === -1) throw new Error(`Column not found: ${name}`);
    return i;
  };
  const idx = {
    id: col('Submission ID'), submittedAt: col('Submitted at'), firstName: col('First'), lastName: col('Last'),
    phone: col('Primary phone'), altPhone: col('Alternate phone'), email: col('Email'), location: col('City & Postal'),
    seeking: col('Whom are you seeking'), aware: col('If you are requesting'), aboutYou: col('Please tell us about you'),
    ageGroup: col('What is the age group'), counselling: col('Please describe the kind'),
    verify: col('Terms & Conditions Agreement (I hereby'), agree: col('Terms & Conditions Agreement (I agree'),
  };

  const submissions = rows.map(r => {
    const rec = Object.fromEntries(Object.entries(idx).map(([k, i]) => [k, r[i]]));
    return { docId: `tally-${clean(rec.id)}`, data: toSubmission(rec) };
  });

  for (const { docId, data } of submissions) {
    console.log(
      `${docId.padEnd(14)} ${data.submittedAt.toISOString().slice(0, 10)} ${data.caseStatus.padEnd(6)} ` +
      `${(data.firstName + ' ' + data.lastName).padEnd(30)} ${(data.city ? (data.city.other || data.city.selection) : '-').padEnd(16)} ` +
      `${(data.postalCode || '-').padEnd(8)} ${data.seekingServicesFor.padEnd(16)} ${data.ageGroup || '-'}`
    );
  }
  const open = submissions.filter(s => s.data.caseStatus === 'new').length;
  console.log(`\n${submissions.length} rows: ${open} awaiting contact, ${submissions.length - open} closed.`);

  if (DRY_RUN) {
    console.log('DRY RUN — nothing written. Re-run with --confirm to import.');
    return;
  }

  initializeFirebase();
  const col_ = admin.firestore().collection('surveys').doc(SURVEY_ID).collection('submissions');
  let created = 0, skipped = 0;
  for (const { docId, data } of submissions) {
    try {
      await col_.doc(docId).create(data);
      created++;
    } catch (e) {
      if (e.code === 6 /* ALREADY_EXISTS */) { skipped++; continue; }
      throw e;
    }
  }
  console.log(`Imported ${created}; skipped ${skipped} already present.`);
}

main().then(() => process.exit(0)).catch(err => {
  console.error('Failed:', err.message);
  process.exit(1);
});
