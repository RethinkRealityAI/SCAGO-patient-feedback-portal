/**
 * Create (or update) the Counselling Intake Form survey.
 *
 * Recreates the Tally form https://tally.so/r/woAjkb on this platform, with
 * submission notifications emailed to the counselling team.
 *
 * The survey doc id and slug are both `counselling-intake`, so the public link
 * is /survey/counselling-intake. Re-running overwrites the form definition but
 * never touches submissions (they live in a subcollection).
 *
 * Usage:
 *   DRY RUN (prints the definition, writes nothing):
 *     node scripts/create-counselling-intake-form.js
 *
 *   WRITE, notifying a specific address (e.g. while testing):
 *     node scripts/create-counselling-intake-form.js --confirm --recipients=tech@sicklecellanemia.ca
 *
 *   WRITE with the production recipient (default):
 *     node scripts/create-counselling-intake-form.js --confirm
 */

const admin = require('firebase-admin');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const SURVEY_ID = 'counselling-intake';
const DEFAULT_RECIPIENTS = ['counselling@sicklecellanemia.ca'];

const DRY_RUN = !process.argv.includes('--confirm');
const recipientsArg = process.argv.find(a => a.startsWith('--recipients='));
const RECIPIENTS = recipientsArg
  ? recipientsArg.split('=')[1].split(',').map(s => s.trim()).filter(Boolean)
  : DEFAULT_RECIPIENTS;

// ─── Firebase init (same pattern as the other scripts in this folder) ───────
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
  throw new Error('Firebase credentials not found in .env.local');
}

// Option values are the visible labels so emails, PDFs and the dashboard show
// exactly what the respondent picked.
const options = labels => labels.map((label, i) => ({ id: `opt-${i + 1}`, label, value: label }));
const required = { required: true };

const CONSENT_TEXT =
  'Thank you for completing this request form. The information submitted will be held confidentially ' +
  'by SCAGO and not shared with other individuals or outside agencies without your documented verbal or ' +
  'written consent. We will contact you within 14 business days of receipt of this form to conduct a phone ' +
  'or virtual consultation to discuss your needs further. Note that SCAGO counselling services are ' +
  'short-term, do not constitute crisis or urgent care or medical advice, and are not intended to ' +
  'substitute for medical treatment or care. If you are experiencing an emergency or crisis, please call ' +
  '911 or visit your nearest Emergency Room. Please click the appropriate option below if you agree with ' +
  'these terms and permit us to contact you.';

// Shown before anything else and repeated in the applicant's confirmation email.
// 988 is Canada's 24/7 Suicide Crisis Helpline (call or text, English and French).
const CRISIS_NOTICE =
  'If you are in crisis or thinking about suicide\n' +
  'Call or text 988 (Suicide Crisis Helpline, available 24/7) or call 911 and go to your nearest emergency room. ' +
  'This form is not monitored around the clock.';
const CRISIS_NOTICE_FR =
  "Si vous êtes en situation de crise ou avez des pensées suicidaires\n" +
  "Appelez ou textez le 988 (Ligne d'aide en cas de crise de suicide, accessible en tout temps) ou composez le 911 et rendez-vous à l'urgence la plus proche. " +
  "Ce formulaire n'est pas surveillé en tout temps.";

// Every English string below must have a French entry in src/lib/form-text-fr.ts.
function buildSurvey(recipients) {
  return {
    title: 'Counselling Intake Form',
    slug: SURVEY_ID,
    description: '',
    appearance: {
      themeColor: '#C8262A',
      cardShadow: 'sm',
      cardTitleSize: 'lg',
      sectionTitleSize: 'lg',
      labelSize: 'sm',
      gradient: true,
    },
    submitButtonLabel: 'Submit request',
    saveProgressEnabled: true,
    // A personal intake form, not something respondents should be prompted to share.
    shareButtonEnabled: false,
    resumeSettings: {
      showResumeModal: true,
      resumeTitle: 'Resume your saved progress?',
      resumeDescription: 'We found a saved draft. Continue where you left off or start over.',
      continueLabel: 'Continue',
      startOverLabel: 'Start over',
      showContinue: true,
      showStartOver: true,
    },
    thankYouSettings: {
      icon: 'checkmark',
      title: 'Thank you',
      description:
        "We've received your counselling request. We will contact you within 14 business days to arrange a phone " +
        'or virtual consultation. A confirmation has been sent to your email. If you are experiencing an emergency ' +
        'or crisis, please call 911 or visit your nearest Emergency Room.',
      showButton: false,
      buttonText: 'Submit Another',
      buttonLink: '',
      themeColor: '#22c55e',
    },
    emailNotifications: {
      enabled: true,
      recipients,
      subject: 'New Counselling Intake Request – {{submissionDate}}',
      attachPdf: true,
      senderName: 'SCAGO Counselling Intake',
      // Listed in the email body so the team can triage from the inbox.
      // Contact safety (voicemail) is included deliberately.
      summaryFieldIds: [
        'primaryPhone',
        'email',
        'preferredContactMethod',
        'bestTimeToContact',
        'voicemailOk',
        'seekingServicesFor',
        'ageGroup',
        'counsellingType',
      ],
    },
    // Acknowledgement to the applicant. Contains none of their answers.
    respondentConfirmation: {
      enabled: true,
      emailFieldId: 'email',
      firstNameFieldId: 'firstName',
      subject: 'We received your counselling request',
      heading: 'We received your request',
      message:
        "Thank you for reaching out to SCAGO's counselling service. Your request has been received and will be kept confidential.",
      nextSteps: [
        'A member of our counselling team will review your request.',
        'We will contact you within 14 business days, using the contact preferences you gave us, to arrange a phone or virtual consultation.',
        'Our counselling services are short-term support, not a crisis service.',
      ],
      urgentNotice: CRISIS_NOTICE,
      replyTo: 'counselling@sicklecellanemia.ca',
      senderName: 'SCAGO Counselling',
      translations: {
        fr: {
          subject: 'Nous avons bien reçu votre demande de counseling',
          heading: 'Nous avons bien reçu votre demande',
          message:
            "Merci d'avoir communiqué avec le service de counseling de SCAGO. Votre demande a bien été reçue et sera traitée de façon confidentielle.",
          nextSteps: [
            'Un membre de notre équipe de counseling examinera votre demande.',
            'Nous communiquerons avec vous dans un délai de 14 jours ouvrables, selon vos préférences de contact, pour organiser une consultation téléphonique ou virtuelle.',
            "Nos services de counseling offrent un soutien de courte durée et ne constituent pas un service d'intervention en situation de crise.",
          ],
          urgentNotice: CRISIS_NOTICE_FR,
          senderName: 'SCAGO – Counseling',
        },
      },
    },
    // Case tracking on the form's dashboard, plus a Monday digest of overdue
    // and soon-due requests.
    caseConfig: {
      enabled: true,
      statuses: [
        { value: 'new', label: 'Awaiting contact' },
        { value: 'contacted', label: 'Contacted' },
        { value: 'consultation-booked', label: 'Consultation booked' },
        { value: 'referred', label: 'Referred elsewhere' },
        { value: 'closed', label: 'Closed' },
      ],
      initialStatus: 'new',
      closedStatuses: ['closed', 'referred'],
      slaBusinessDays: 14,
      assignees: [],
      digest: { enabled: true, recipients },
    },
    // Kept in step with caseConfig by the dashboard (anything past "Awaiting
    // contact" counts as reviewed), so the main dashboard's counts agree.
    reviewConfig: {
      enabled: true,
      actionLabel: 'Mark as Contacted',
      reviewedLabel: 'Contacted',
      pendingLabel: 'Awaiting contact',
      undoLabel: 'Undo',
    },
    dashboardColumns: [
      { fieldId: 'firstName', label: 'First name' },
      { fieldId: 'lastName', label: 'Last name' },
      { fieldId: 'primaryPhone', label: 'Phone' },
      { fieldId: 'city', label: 'City' },
      { fieldId: 'preferredContactMethod', label: 'Prefers' },
      { fieldId: 'counsellingType', label: 'Counselling sought' },
    ],
    // Filters on the case dashboard (alongside status, assignee and date).
    dashboardFilters: [
      { fieldId: 'counsellingType', label: 'Counselling sought' },
      { fieldId: 'seekingServicesFor', label: 'Seeking services for' },
      { fieldId: 'aboutYou', label: 'Applicant is' },
      { fieldId: 'ageGroup', label: 'Age group' },
      { fieldId: 'city', label: 'City' },
      { fieldId: 'preferredContactMethod', label: 'Preferred contact' },
    ],
    // Staff work this form from the case list; the AI summary isn't needed.
    aiAnalysisEnabled: false,
    sections: [
      {
        id: 'intro-section',
        title: 'Before You Begin',
        fields: [
          { id: 'crisisNotice', label: '', type: 'text-block', tone: 'urgent', helperText: CRISIS_NOTICE, validation: { required: false } },
          {
            id: 'formIntro',
            label: '',
            type: 'text-block',
            helperText:
              'This form takes about 3 minutes. Questions marked * are required. Your progress is saved on this device, so you can come back to it.',
            validation: { required: false },
          },
        ],
      },
      {
        id: 'details-section',
        title: 'Your Details',
        fields: [
          {
            id: 'name-group',
            label: 'Name',
            type: 'group',
            fields: [
              { id: 'firstName', label: 'First name', type: 'text', validation: required },
              { id: 'lastName', label: 'Last name', type: 'text', validation: required },
            ],
          },
          {
            id: 'phone-group',
            label: 'Phone',
            type: 'group',
            fields: [
              { id: 'primaryPhone', label: 'Primary phone number', type: 'phone', validation: required },
              // Optional: requiring a second number turned people away.
              { id: 'alternatePhone', label: 'Alternate phone number (optional)', type: 'phone', validation: { required: false } },
            ],
          },
          { id: 'email', label: 'Email', type: 'email', validation: required },
          {
            id: 'location-group',
            label: 'Location',
            type: 'group',
            fields: [
              { id: 'city', label: 'City', type: 'city-on', validation: required },
              {
                id: 'postalCode',
                label: 'Postal code',
                type: 'text',
                placeholder: 'e.g. M5V 1A1',
                validation: { required: true, pattern: '^[A-Za-z]\\d[A-Za-z][ -]?\\d[A-Za-z]\\d$' },
              },
            ],
          },
        ],
      },
      {
        id: 'contact-preferences-section',
        title: 'How We Can Reach You',
        fields: [
          {
            id: 'preferredContactMethod',
            label: 'How would you prefer we contact you?',
            type: 'radio',
            options: options(['Phone call', 'Text message', 'Email']),
            validation: required,
          },
          {
            id: 'bestTimeToContact',
            label: 'When is the best time to reach you? (select all that apply)',
            type: 'checkbox',
            options: options(['Weekday mornings', 'Weekday afternoons', 'Weekday evenings', 'Weekends']),
            validation: { required: false },
          },
          {
            // A voicemail naming SCAGO can disclose someone's health connection
            // to whoever else hears it.
            id: 'voicemailOk',
            label: 'Is it okay for us to leave a voicemail that mentions SCAGO?',
            type: 'radio',
            options: options(['Yes, a voicemail is fine', "No, please don't leave a voicemail"]),
            validation: required,
          },
        ],
      },
      {
        id: 'request-section',
        title: 'About Your Request',
        fields: [
          {
            id: 'seekingServicesFor',
            label: 'Whom are you seeking services for? (Mark only one)',
            type: 'radio',
            options: options(['Myself', 'A family member', 'Someone else']),
            validation: required,
          },
          {
            // Only asked when the request is for another person.
            id: 'othersAware',
            label: 'Is the person you are requesting services for aware of this request?',
            type: 'radio',
            options: options(['Yes', 'No']),
            conditionField: 'seekingServicesFor',
            conditionValues: ['A family member', 'Someone else'],
            conditionValue: 'Someone else', // fallback for editors that only read one value
            validation: required,
          },
          {
            id: 'aboutYou',
            label: 'Please tell us about you (select all that apply)',
            type: 'checkbox',
            options: options([
              'I am an individual with sickle cell disease',
              'I am a parent or family member of a person with sickle cell disease',
            ]),
            // Friends, support workers, etc. had no truthful option before.
            otherOption: { enabled: true, optionValue: 'Other', label: 'Other', fieldType: 'text', placeholder: 'Please describe', required: true },
            validation: required,
          },
          {
            // Single choice: the request is about one person. The original
            // ranges skipped age 12 ("under 12" then "13 to 17").
            id: 'ageGroup',
            label: 'What is the age group of the person you are seeking services for?',
            type: 'radio',
            options: options([
              'Child (12 years or younger)',
              'Teen (13 to 17 years)',
              'Adult (18 to 59 years)',
              'Senior (60 years or older)',
            ]),
            validation: required,
          },
          {
            id: 'counsellingType',
            label: 'Please describe the kind of counselling you are seeking',
            type: 'checkbox',
            options: options([
              'Connection to community resources',
              'Personal or Family Support',
              'Healthy coping skill development (e.g., stress management)',
              'Grief and Loss',
              'Food, housing, or income security',
              'Poor quality of care received in an Ontario hospital',
            ]),
            otherOption: { enabled: true, optionValue: 'Other', label: 'Other', fieldType: 'text', placeholder: 'Please describe', required: true },
            validation: required,
          },
        ],
      },
      {
        id: 'terms-section',
        title: 'Terms & Conditions Agreement',
        fields: [
          { id: 'consentText', label: '', type: 'text-block', helperText: CONSENT_TEXT, validation: { required: false } },
          {
            id: 'verifyInformation',
            label: 'I hereby verify that all information provided on this form is true',
            type: 'boolean-checkbox',
            validation: required,
          },
          { id: 'agreeTerms', label: 'I agree to these terms.', type: 'boolean-checkbox', validation: required },
        ],
      },
    ],
  };
}

async function main() {
  const survey = buildSurvey(RECIPIENTS);
  const fieldCount = survey.sections.reduce(
    (n, s) => n + s.fields.reduce((m, f) => m + (f.fields ? f.fields.length : 1), 0),
    0
  );

  console.log(`Survey: ${survey.title}  (doc id / slug: ${SURVEY_ID})`);
  console.log(`Sections: ${survey.sections.length}  Fields: ${fieldCount}`);
  console.log(`Notifications → ${RECIPIENTS.join(', ')}`);

  if (DRY_RUN) {
    console.log('\nDRY RUN — nothing written. Re-run with --confirm to save.');
    return;
  }

  initializeFirebase();
  const ref = admin.firestore().collection('surveys').doc(SURVEY_ID);
  const existing = await ref.get();
  // No createdAt/updatedAt: the survey page hands this document straight to a
  // client component, and Firestore Timestamps are not serialisable props
  // (Next.js rejects them). The survey editor doesn't store them either.
  await ref.set(
    {
      ...survey,
      createdAt: admin.firestore.FieldValue.delete(),
      updatedAt: admin.firestore.FieldValue.delete(),
    },
    // merge keeps any fields set later in the editor; sections are replaced wholesale.
    { merge: true }
  );
  console.log(`\n${existing.exists ? 'Updated' : 'Created'} surveys/${SURVEY_ID}`);
  console.log(`Public link: ${process.env.NEXT_PUBLIC_APP_URL || ''}/survey/${SURVEY_ID}`);
}

// Exported so tests can check the definition (e.g. French coverage).
module.exports = { buildSurvey };

if (require.main === module) {
  main().catch(err => {
    console.error('Failed:', err.message);
    process.exit(1);
  });
}
