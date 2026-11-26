/**
 * The website's "Contact Us" form (sicklecellanemia.ca/contact).
 *
 * Embedded on the Framer site with an iframe pointing at
 * /embed/website-contact (add ?lang=fr on the French pages). Every submission
 * is stored on this form's dashboard (with CSV export) and emailed to
 * info@sicklecellanemia.ca with the sender as Reply-To; the sender gets an
 * acknowledgement in their language.
 *
 * Created or updated with POST /api/admin/migrations/seed-contact-form (admins
 * only). Every English string shown to visitors must have a French entry in
 * src/lib/form-text-fr.ts; a test checks this.
 */

export const CONTACT_FORM_ID = 'website-contact';
export const CONTACT_FORM_TEMPLATE_VERSION = 2;
export const CONTACT_FORM_DEFAULT_RECIPIENTS = ['info@sicklecellanemia.ca'];

// Option values are the visible English labels, so the email, CSV and
// dashboard show exactly what was picked (the form translates them on screen).
const options = (labels: string[]) => labels.map((label, i) => ({ id: `opt-${i + 1}`, label, value: label }));

export const INQUIRY_TYPES = [
  'General question',
  'Support for patients and families',
  'Counselling services',
  'Financial assistance',
  'Programs and events',
  'Volunteering and getting involved',
  'Donations and fundraising',
  'Membership',
  'Healthcare professional inquiry',
  'Media, partnerships or speaking requests',
  'Website or technical issue',
  'Something else',
];

export const RESPONDENT_TYPES = [
  'A person living with sickle cell disease',
  'A parent, family member or caregiver',
  'A healthcare professional',
  'A student or researcher',
  'A community member or supporter',
  'Representing an organization',
  'Other',
];

export const EMERGENCY_NOTICE =
  'Need urgent medical help?\n' +
  'If you or someone you care for is having a sickle cell crisis or another medical emergency, call 911 or go to your nearest emergency department. This form is not monitored around the clock.';

export const COUNSELLING_NOTICE =
  'Looking for counselling?\n' +
  'Counselling requests go through the Counselling Intake Form on our Counselling page, which reaches our counselling team directly. You can still send a general question here.';

export const FINANCIAL_NOTICE =
  'Applying for financial assistance?\n' +
  'Applications are made through the form on our Financial Assistance page. You can still send a general question here.';

const CONFIRMATION_URGENT_EN = 'If this is a medical emergency\nCall 911 or go to your nearest emergency department.';
const CONFIRMATION_URGENT_FR =
  "S'il s'agit d'une urgence médicale\nComposez le 911 ou rendez-vous au service d'urgence le plus proche.";

// Lenient on purpose: people type "(416) 745-4267", "416.745.4267", "+1 416…".
const PHONE_PATTERN = '^[+]?[0-9 ().-]{7,20}$';

export function createContactFormTemplate(recipients: string[] = CONTACT_FORM_DEFAULT_RECIPIENTS) {
  return {
    title: 'Contact Us',
    slug: CONTACT_FORM_ID,
    description: '',
    templateKey: 'website-contact',
    templateVersion: CONTACT_FORM_TEMPLATE_VERSION,
    appearance: {
      themeColor: '#C8262A',
      cardShadow: 'none',
      cardTitleSize: 'lg',
      sectionTitleSize: 'md',
      labelSize: 'md',
      gradient: false,
      // The website page already has the "Contact us" heading.
      showTitle: false,
    },
    submitButtonLabel: 'Send message',
    // One section per screen ("Step 1 of 2"), so the form never reads as a
    // long scroll of stacked boxes.
    multiStep: true,
    // A short form; a saved draft would also linger on shared computers.
    saveProgressEnabled: false,
    shareButtonEnabled: false,
    thankYouSettings: {
      icon: 'checkmark',
      title: 'Thank you for reaching out',
      description:
        "Your message has been sent to the SCAGO team and we'll get back to you as soon as we can. " +
        "We've also emailed you a confirmation. If this is a medical emergency, call 911.",
      showButton: true,
      buttonText: 'Send another message',
      buttonLink: '',
      themeColor: '#C8262A',
    },
    emailNotifications: {
      enabled: true,
      recipients,
      // e.g. "Website message: Membership – Jane Doe"
      subject: 'Website message: {{answer:inquiryType}} – {{answer:firstName}} {{answer:lastName}}',
      // Everything is in the email body; a PDF of a short message is just noise.
      attachPdf: false,
      senderName: 'SCAGO Website',
      // Staff can press Reply to answer the person directly.
      replyToFieldId: 'email',
      summaryFieldIds: [
        'inquiryType',
        'respondentType',
        'organization',
        'subject',
        'message',
        'email',
        'phone',
        'preferredContact',
        'city',
        'newsletterOptIn',
      ],
    },
    respondentConfirmation: {
      enabled: true,
      emailFieldId: 'email',
      firstNameFieldId: 'firstName',
      subject: 'We received your message – SCAGO',
      heading: 'Thanks for contacting SCAGO',
      message:
        'We have received your message, and a member of our team will get back to you as soon as possible.',
      nextSteps: [
        'Our team reads every message and will reply by email or phone.',
        'If you have something to add, simply reply to this email.',
      ],
      urgentNotice: CONFIRMATION_URGENT_EN,
      replyTo: 'info@sicklecellanemia.ca',
      senderName: 'SCAGO',
      translations: {
        fr: {
          subject: 'Nous avons bien reçu votre message – SCAGO',
          heading: "Merci d'avoir communiqué avec SCAGO",
          message:
            'Nous avons bien reçu votre message. Un membre de notre équipe vous répondra dès que possible.',
          nextSteps: [
            'Notre équipe lit chaque message et vous répondra par courriel ou par téléphone.',
            "Si vous souhaitez ajouter quelque chose, répondez simplement à ce courriel.",
          ],
          urgentNotice: CONFIRMATION_URGENT_FR,
          senderName: 'SCAGO',
        },
      },
    },
    // "Mark as replied" on the dashboard, so the team can see what's still open.
    reviewConfig: {
      enabled: true,
      actionLabel: 'Mark as replied',
      reviewedLabel: 'Replied',
      pendingLabel: 'Awaiting reply',
      undoLabel: 'Undo',
    },
    dashboardColumns: [
      { fieldId: 'firstName', label: 'First name' },
      { fieldId: 'lastName', label: 'Last name' },
      { fieldId: 'email', label: 'Email' },
      { fieldId: 'inquiryType', label: 'About' },
      { fieldId: 'respondentType', label: 'Sender is' },
    ],
    dashboardFilters: [
      { fieldId: 'inquiryType', label: 'About' },
      { fieldId: 'respondentType', label: 'Sender is' },
      { fieldId: 'city', label: 'City' },
    ],
    // Messages are personal; they are not sent for AI summaries.
    aiAnalysisEnabled: false,
    sections: [
      {
        id: 'contact-message-section',
        title: 'How can we help?',
        fields: [
          { id: 'emergencyNotice', label: '', type: 'text-block', tone: 'subtle', icon: 'phone', helperText: EMERGENCY_NOTICE, validation: { required: false } },
          {
            id: 'inquiryType',
            label: 'What is your message about?',
            type: 'select',
            options: options(INQUIRY_TYPES),
            validation: { required: true },
          },
          {
            id: 'counsellingNotice',
            label: '',
            type: 'text-block',
            tone: 'subtle',
            helperText: COUNSELLING_NOTICE,
            conditionField: 'inquiryType',
            conditionValues: ['Counselling services'],
            conditionValue: 'Counselling services',
            validation: { required: false },
          },
          {
            id: 'financialNotice',
            label: '',
            type: 'text-block',
            tone: 'subtle',
            helperText: FINANCIAL_NOTICE,
            conditionField: 'inquiryType',
            conditionValues: ['Financial assistance'],
            conditionValue: 'Financial assistance',
            validation: { required: false },
          },
          {
            id: 'respondentType',
            label: 'Which best describes you?',
            type: 'select',
            options: options(RESPONDENT_TYPES),
            validation: { required: true },
          },
          {
            id: 'organization',
            label: 'Organization or workplace (optional)',
            type: 'text',
            conditionField: 'respondentType',
            conditionValues: ['Representing an organization', 'A healthcare professional', 'A student or researcher'],
            conditionValue: 'Representing an organization',
            validation: { required: false },
          },
          {
            id: 'subject',
            label: 'Subject (optional)',
            type: 'text',
            placeholder: 'A few words about your message',
            validation: { required: false },
          },
          {
            id: 'message',
            label: 'Your message',
            type: 'textarea',
            placeholder: "Tell us how we can help. Please don't include detailed medical information.",
            validation: { required: true },
          },
        ],
      },
      {
        id: 'contact-details-section',
        title: 'How can we reach you?',
        fields: [
          {
            id: 'contact-name-group',
            label: 'Name',
            type: 'group',
            fields: [
              { id: 'firstName', label: 'First name', type: 'text', validation: { required: true } },
              { id: 'lastName', label: 'Last name', type: 'text', validation: { required: true } },
            ],
          },
          {
            id: 'contact-reach-group',
            label: 'Contact',
            type: 'group',
            fields: [
              { id: 'email', label: 'Email', type: 'email', validation: { required: true } },
              {
                id: 'phone',
                label: 'Phone (optional)',
                type: 'phone',
                placeholder: 'e.g. 416-555-0123',
                validation: { required: false, pattern: PHONE_PATTERN },
              },
            ],
          },
          {
            id: 'preferredContact',
            label: 'How would you like us to reply?',
            type: 'radio',
            options: options(['Email', 'Phone']),
            validation: { required: false },
          },
          { id: 'city', label: 'City or town (optional)', type: 'city-on', validation: { required: false } },
          {
            id: 'consentToContact',
            label: "I agree that SCAGO may use the information I've shared to respond to my message.",
            type: 'boolean-checkbox',
            validation: { required: true },
          },
          {
            id: 'newsletterOptIn',
            label: 'Send me SCAGO news, events and program updates by email (optional).',
            type: 'boolean-checkbox',
            validation: { required: false },
          },
        ],
      },
    ],
  };
}

export function createSeededContactForm(recipients?: string[]) {
  return { id: CONTACT_FORM_ID, ...createContactFormTemplate(recipients) };
}
