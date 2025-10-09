import { nanoid } from 'nanoid';

/**
 * Question Bank - Curated collection of pre-configured questions
 * Extracted from proven survey templates with validation, options, and conditional logic
 */

/**
 * Field configuration for question bank items
 * Matches the survey field schema structure
 */
export interface FieldConfig {
  id: string;
  type: string;
  label: string;
  placeholder?: string;
  validation?: {
    required?: boolean;
    pattern?: string;
  };
  options?: Array<{
    id: string;
    label: string;
    value: string;
  }>;
  conditionField?: string;
  conditionValue?: string;
  min?: number;
  max?: number;
  step?: number;
}

export interface QuestionTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  icon: string;
  fieldConfig: FieldConfig;
  popular?: boolean;
}

/**
 * Question Bank organized by category
 */
export const questionBank: Record<string, QuestionTemplate[]> = {
  // ============================================
  // CONTACT INFORMATION
  // ============================================
  contact: [
    {
      id: 'firstName',
      name: 'First Name',
      description: 'Standard first name text field with validation',
      category: 'Contact',
      tags: ['name', 'personal', 'required'],
      icon: '👤',
      popular: true,
      fieldConfig: {
        id: 'firstName',
        type: 'text',
        label: 'First Name',
        validation: { required: true },
      },
    },
    {
      id: 'lastName',
      name: 'Last Name',
      description: 'Standard last name text field with validation',
      category: 'Contact',
      tags: ['name', 'personal', 'required'],
      icon: '👤',
      popular: true,
      fieldConfig: {
        id: 'lastName',
        type: 'text',
        label: 'Last Name',
        validation: { required: true },
      },
    },
    {
      id: 'email',
      name: 'Email Address',
      description: 'Email field with built-in validation',
      category: 'Contact',
      tags: ['email', 'contact', 'required'],
      icon: '📧',
      popular: true,
      fieldConfig: {
        id: 'email',
        type: 'email',
        label: 'Email Address',
        validation: { required: true },
      },
    },
    {
      id: 'phone',
      name: 'Phone Number',
      description: 'Phone number field with format validation',
      category: 'Contact',
      tags: ['phone', 'contact', 'required'],
      icon: '📱',
      popular: true,
      fieldConfig: {
        id: 'phone',
        type: 'phone',
        label: 'Phone Number',
        validation: { required: true },
      },
    },
    {
      id: 'streetAddress',
      name: 'Street Address',
      description: 'Full street address text field',
      category: 'Contact',
      tags: ['address', 'location'],
      icon: '🏠',
      popular: false,
      fieldConfig: {
        id: 'streetAddress',
        type: 'text',
        label: 'Street Address',
        validation: { required: true },
      },
    },
    {
      id: 'city',
      name: 'City (Ontario)',
      description: 'Ontario city selector with "Other" option',
      category: 'Contact',
      tags: ['location', 'ontario', 'canada'],
      icon: '🏙️',
      popular: true,
      fieldConfig: {
        id: 'city',
        type: 'city-on',
        label: 'City',
        validation: { required: true },
      },
    },
    {
      id: 'province',
      name: 'Province (Canada)',
      description: 'Canadian province selector',
      category: 'Contact',
      tags: ['location', 'canada'],
      icon: '🍁',
      popular: true,
      fieldConfig: {
        id: 'province',
        type: 'province-ca',
        label: 'Province',
        validation: { required: true },
      },
    },
    {
      id: 'postalCode',
      name: 'Postal Code',
      description: 'Postal code text field',
      category: 'Contact',
      tags: ['address', 'location'],
      icon: '📮',
      popular: false,
      fieldConfig: {
        id: 'postalCode',
        type: 'text',
        label: 'Postal Code',
        validation: { required: true },
      },
    },
  ],

  // ============================================
  // HEALTHCARE SPECIFIC
  // ============================================
  healthcare: [
    {
      id: 'hospitalName',
      name: 'Hospital Name (Ontario)',
      description: 'Searchable Ontario hospital selector with "Other" option',
      category: 'Healthcare',
      tags: ['hospital', 'ontario', 'healthcare'],
      icon: '🏥',
      popular: true,
      fieldConfig: {
        id: 'hospitalName',
        type: 'hospital-on',
        label: 'Hospital Name',
        validation: { required: true },
      },
    },
    {
      id: 'department',
      name: 'Hospital Department',
      description: 'Common hospital department selector',
      category: 'Healthcare',
      tags: ['department', 'hospital', 'healthcare'],
      icon: '🏥',
      popular: true,
      fieldConfig: {
        id: 'department',
        type: 'department-on',
        label: 'Department or Service',
        validation: { required: true },
      },
    },
    {
      id: 'patientOrCaregiver',
      name: 'Patient or Caregiver',
      description: 'Selector to identify if respondent is patient or caregiver',
      category: 'Healthcare',
      tags: ['patient', 'caregiver', 'role'],
      icon: '👨‍⚕️',
      popular: true,
      fieldConfig: {
        id: 'patientOrCaregiver',
        type: 'select',
        label: 'Are you a patient or a caregiver?',
        validation: { required: true },
        options: [
          { id: nanoid(), label: 'Patient', value: 'patient' },
          { id: nanoid(), label: 'Caregiver', value: 'caregiver' },
          { id: nanoid(), label: 'Other', value: 'other' },
        ],
      },
    },
    {
      id: 'visitType',
      name: 'Visit Type',
      description: 'Type of hospital visit (Outpatient, Emergency, Inpatient)',
      category: 'Healthcare',
      tags: ['visit', 'hospital', 'appointment'],
      icon: '🏥',
      popular: true,
      fieldConfig: {
        id: 'visitType',
        type: 'radio',
        label: 'Which type of hospital encounter did you have?',
        validation: { required: true },
        options: [
          { id: nanoid(), label: 'Outpatient clinic visit', value: 'outpatient' },
          { id: nanoid(), label: 'Emergency department', value: 'emergency' },
          { id: nanoid(), label: 'Inpatient admission', value: 'inpatient' },
        ],
      },
    },
    {
      id: 'physicianName',
      name: 'Physician Name',
      description: 'Name of treating physician',
      category: 'Healthcare',
      tags: ['physician', 'doctor', 'provider'],
      icon: '👨‍⚕️',
      popular: false,
      fieldConfig: {
        id: 'physicianName',
        type: 'text',
        label: 'Name of Physician',
        placeholder: 'Dr. Smith',
      },
    },
    {
      id: 'hcpFamiliarity',
      name: 'HCP Familiarity with Condition',
      description: 'How familiar healthcare providers were with patient condition',
      category: 'Healthcare',
      tags: ['familiarity', 'knowledge', 'provider'],
      icon: '🩺',
      popular: true,
      fieldConfig: {
        id: 'hcpFamiliarity',
        type: 'select',
        label: 'How familiar were the health care providers (HCP) with your condition?',
        validation: { required: true },
        options: [
          { id: nanoid(), label: 'Very Familiar', value: 'very-familiar' },
          { id: nanoid(), label: 'Somewhat Familiar', value: 'somewhat-familiar' },
          { id: nanoid(), label: 'Not at all Familiar', value: 'not-at-all-familiar' },
        ],
      },
    },
    {
      id: 'inPainCrisis',
      name: 'In Pain Crisis',
      description: 'Yes/No question about pain crisis admission',
      category: 'Healthcare',
      tags: ['pain', 'crisis', 'scd'],
      icon: '🩹',
      popular: false,
      fieldConfig: {
        id: 'inPainCrisis',
        type: 'radio',
        label: 'Were you in the hospital for pain crisis?',
        validation: { required: true },
        options: [
          { id: nanoid(), label: 'Yes', value: 'yes' },
          { id: nanoid(), label: 'No', value: 'no' },
        ],
      },
    },
    {
      id: 'timeToAnalgesia',
      name: 'Time to First Analgesia',
      description: 'Duration field for time until pain medication (hours/minutes)',
      category: 'Healthcare',
      tags: ['pain', 'medication', 'duration'],
      icon: '⏱️',
      popular: false,
      fieldConfig: {
        id: 'timeToAnalgesia',
        type: 'duration-hm',
        label: 'How long before the first analgesia was administered?',
      },
    },
  ],

  // ============================================
  // DATE & TIME
  // ============================================
  datetime: [
    {
      id: 'visitDate',
      name: 'Visit Date',
      description: 'Date picker for appointment or visit date',
      category: 'Date & Time',
      tags: ['date', 'visit', 'appointment'],
      icon: '📅',
      popular: true,
      fieldConfig: {
        id: 'visitDate',
        type: 'date',
        label: 'Date of Visit',
        validation: { required: true },
      },
    },
    {
      id: 'interactionDate',
      name: 'Interaction Date',
      description: 'Date of hospital interaction or event',
      category: 'Date & Time',
      tags: ['date', 'interaction'],
      icon: '📅',
      popular: true,
      fieldConfig: {
        id: 'interactionDate',
        type: 'date',
        label: 'Date of Interaction',
        validation: { required: true },
      },
    },
    {
      id: 'visitTime',
      name: 'Visit Time',
      description: 'Time picker for appointment time',
      category: 'Date & Time',
      tags: ['time', 'visit', 'appointment'],
      icon: '🕐',
      popular: false,
      fieldConfig: {
        id: 'visitTime',
        type: 'time',
        label: 'Time of Visit',
      },
    },
    {
      id: 'dateOfBirth',
      name: 'Date of Birth',
      description: 'Date picker for birth date',
      category: 'Date & Time',
      tags: ['date', 'birth', 'personal'],
      icon: '🎂',
      popular: false,
      fieldConfig: {
        id: 'dateOfBirth',
        type: 'date',
        label: 'Date of Birth',
        validation: { required: true },
      },
    },
    {
      id: 'hospitalStayLength',
      name: 'Hospital Stay Duration',
      description: 'Duration field with value and unit selector',
      category: 'Date & Time',
      tags: ['duration', 'stay', 'hospital'],
      icon: '⏱️',
      popular: false,
      fieldConfig: {
        id: 'hospitalStayLength',
        type: 'time-amount',
        label: 'How long was your hospital stay?',
      },
    },
  ],

  // ============================================
  // FEEDBACK & RATINGS
  // ============================================
  feedback: [
    {
      id: 'rating',
      name: 'Overall Rating (1-5)',
      description: '5-star rating scale for overall experience',
      category: 'Feedback',
      tags: ['rating', 'satisfaction', 'experience'],
      icon: '⭐',
      popular: true,
      fieldConfig: {
        id: 'rating',
        type: 'rating',
        label: 'How would you rate your overall experience?',
        validation: { required: true },
      },
    },
    {
      id: 'npsScore',
      name: 'NPS Score (1-10)',
      description: 'Net Promoter Score - 10-point scale',
      category: 'Feedback',
      tags: ['nps', 'satisfaction', 'recommendation'],
      icon: '📊',
      popular: true,
      fieldConfig: {
        id: 'npsScore',
        type: 'nps',
        label: 'On a scale of 1-10, what would you rate the quality of care you received?',
        validation: { required: true },
      },
    },
    {
      id: 'experienceDescription',
      name: 'Experience Description',
      description: 'Large text area for detailed experience narrative',
      category: 'Feedback',
      tags: ['textarea', 'experience', 'description'],
      icon: '💬',
      popular: true,
      fieldConfig: {
        id: 'experienceDescription',
        type: 'textarea',
        label: 'Please describe your experience',
        validation: { required: true },
      },
    },
    {
      id: 'additionalComments',
      name: 'Additional Comments',
      description: 'Optional comments or suggestions field',
      category: 'Feedback',
      tags: ['textarea', 'comments', 'optional'],
      icon: '💭',
      popular: true,
      fieldConfig: {
        id: 'additionalComments',
        type: 'textarea',
        label: 'Is there anything else you would like us to know?',
      },
    },
    {
      id: 'rightInvestigations',
      name: 'Right Investigations Conducted',
      description: 'Whether appropriate tests/investigations were done',
      category: 'Feedback',
      tags: ['investigation', 'tests', 'satisfaction'],
      icon: '🔬',
      popular: false,
      fieldConfig: {
        id: 'rightInvestigations',
        type: 'select',
        label: 'Did you feel the right investigation/tests were conducted?',
        validation: { required: true },
        options: [
          { id: nanoid(), label: 'Yes', value: 'yes' },
          { id: nanoid(), label: 'No', value: 'no' },
          { id: nanoid(), label: 'Not Applicable', value: 'not-applicable' },
        ],
      },
    },
    {
      id: 'concernsAddressed',
      name: 'Concerns Addressed',
      description: 'Whether patient concerns were adequately addressed',
      category: 'Feedback',
      tags: ['concerns', 'satisfaction', 'care'],
      icon: '✓',
      popular: false,
      fieldConfig: {
        id: 'concernsAddressed',
        type: 'select',
        label: 'Did you feel your concerns were well addressed?',
        validation: { required: true },
        options: [
          { id: nanoid(), label: 'Yes', value: 'yes' },
          { id: nanoid(), label: 'No', value: 'no' },
          { id: nanoid(), label: 'Not Applicable', value: 'not-applicable' },
        ],
      },
    },
    {
      id: 'optimalTime',
      name: 'Optimal Time Spent',
      description: 'Whether adequate time was spent with provider',
      category: 'Feedback',
      tags: ['time', 'satisfaction', 'care'],
      icon: '⏰',
      popular: false,
      fieldConfig: {
        id: 'optimalTime',
        type: 'select',
        label: 'Did you feel that you had an optimal amount of time?',
        validation: { required: true },
        options: [
          { id: nanoid(), label: 'Yes', value: 'yes' },
          { id: nanoid(), label: 'No', value: 'no' },
          { id: nanoid(), label: 'Not Applicable', value: 'not-applicable' },
        ],
      },
    },
    {
      id: 'hcpRespectfulness',
      name: 'HCP Respectfulness',
      description: 'How respectful healthcare providers were',
      category: 'Feedback',
      tags: ['respect', 'satisfaction', 'provider'],
      icon: '🤝',
      popular: false,
      fieldConfig: {
        id: 'hcpRespectfulness',
        type: 'textarea',
        label: 'How respectful were the HCPs of your needs and concerns?',
      },
    },
  ],

  // ============================================
  // CONSENT & LEGAL
  // ============================================
  consent: [
    {
      id: 'ageConfirmation',
      name: 'Age Confirmation (18+)',
      description: 'Checkbox to confirm user is 18 or older',
      category: 'Consent',
      tags: ['age', 'consent', 'legal', 'required'],
      icon: '✅',
      popular: true,
      fieldConfig: {
        id: 'ageConfirmation',
        type: 'boolean-checkbox',
        label: 'I confirm that I am 18 years of age or older',
        validation: { required: true },
      },
    },
    {
      id: 'consentToParticipate',
      name: 'Consent to Participate',
      description: 'General consent checkbox for survey participation',
      category: 'Consent',
      tags: ['consent', 'legal', 'required'],
      icon: '✅',
      popular: true,
      fieldConfig: {
        id: 'consentToParticipate',
        type: 'boolean-checkbox',
        label: 'I consent to participate in this survey and understand how my data will be used',
        validation: { required: true },
      },
    },
    {
      id: 'digitalSignature',
      name: 'Digital Signature',
      description: 'Text field for full name as digital signature',
      category: 'Consent',
      tags: ['signature', 'consent', 'legal'],
      icon: '✍️',
      popular: true,
      fieldConfig: {
        id: 'digitalSignature',
        type: 'text',
        label: 'Full Name (Digital Signature)',
        validation: { required: true },
      },
    },
    {
      id: 'signatureDate',
      name: 'Signature Date',
      description: 'Date field for signature date',
      category: 'Consent',
      tags: ['date', 'signature', 'legal'],
      icon: '📅',
      popular: true,
      fieldConfig: {
        id: 'signatureDate',
        type: 'date',
        label: 'Date',
        validation: { required: true },
      },
    },
    {
      id: 'submitAnonymously',
      name: 'Submit Anonymously',
      description: 'Toggle to hide contact fields for anonymous submission',
      category: 'Consent',
      tags: ['anonymous', 'privacy'],
      icon: '🔒',
      popular: false,
      fieldConfig: {
        id: 'submitAnonymously',
        type: 'anonymous-toggle',
        label: 'Submit anonymously',
      },
    },
  ],

  // ============================================
  // YES/NO QUESTIONS
  // ============================================
  yesno: [
    {
      id: 'mayContact',
      name: 'May Contact',
      description: 'Permission to contact for follow-up',
      category: 'Yes/No',
      tags: ['contact', 'permission', 'follow-up'],
      icon: '📞',
      popular: true,
      fieldConfig: {
        id: 'mayContact',
        type: 'radio',
        label: 'May we contact you about services, programs, or events?',
        validation: { required: true },
        options: [
          { id: nanoid(), label: 'Yes', value: 'yes' },
          { id: nanoid(), label: 'No', value: 'no' },
        ],
      },
    },
    {
      id: 'reportedToHospital',
      name: 'Reported to Hospital',
      description: 'Whether issue was reported to hospital',
      category: 'Yes/No',
      tags: ['report', 'complaint', 'hospital'],
      icon: '📋',
      popular: false,
      fieldConfig: {
        id: 'reportedToHospital',
        type: 'radio',
        label: 'Did you report this situation to the hospital?',
        validation: { required: true },
        options: [
          { id: nanoid(), label: 'Yes', value: 'yes' },
          { id: nanoid(), label: 'No', value: 'no' },
        ],
      },
    },
    {
      id: 'timelyMedications',
      name: 'Timely Medications',
      description: 'Whether medications were received in a timely manner',
      category: 'Yes/No',
      tags: ['medication', 'timing', 'care'],
      icon: '💊',
      popular: false,
      fieldConfig: {
        id: 'timelyMedications',
        type: 'radio',
        label: 'Did you receive timely medications while in the hospital?',
        validation: { required: true },
        options: [
          { id: nanoid(), label: 'Yes', value: 'yes' },
          { id: nanoid(), label: 'No', value: 'no' },
        ],
      },
    },
  ],

  // ============================================
  // DEMOGRAPHICS
  // ============================================
  demographics: [
    {
      id: 'ageRange',
      name: 'Age Range',
      description: 'Age range selector for demographics',
      category: 'Demographics',
      tags: ['age', 'demographics'],
      icon: '👥',
      popular: false,
      fieldConfig: {
        id: 'ageRange',
        type: 'select',
        label: 'Age Range',
        options: [
          { id: nanoid(), label: '18-24', value: '18-24' },
          { id: nanoid(), label: '25-34', value: '25-34' },
          { id: nanoid(), label: '35-44', value: '35-44' },
          { id: nanoid(), label: '45-54', value: '45-54' },
          { id: nanoid(), label: '55-64', value: '55-64' },
          { id: nanoid(), label: '65+', value: '65+' },
        ],
      },
    },
    {
      id: 'gender',
      name: 'Gender',
      description: 'Gender selector for demographics',
      category: 'Demographics',
      tags: ['gender', 'demographics'],
      icon: '👤',
      popular: false,
      fieldConfig: {
        id: 'gender',
        type: 'select',
        label: 'Gender',
        options: [
          { id: nanoid(), label: 'Male', value: 'male' },
          { id: nanoid(), label: 'Female', value: 'female' },
          { id: nanoid(), label: 'Non-binary', value: 'non-binary' },
          { id: nanoid(), label: 'Prefer not to say', value: 'prefer-not-to-say' },
        ],
      },
    },
    {
      id: 'title',
      name: 'Title',
      description: 'Personal title selector (Mr, Mrs, Ms, Dr, etc)',
      category: 'Demographics',
      tags: ['title', 'personal'],
      icon: '👤',
      popular: false,
      fieldConfig: {
        id: 'title',
        type: 'radio',
        label: 'Title',
        validation: { required: true },
        options: [
          { id: nanoid(), label: 'Mr', value: 'mr' },
          { id: nanoid(), label: 'Mrs', value: 'mrs' },
          { id: nanoid(), label: 'Ms', value: 'ms' },
          { id: nanoid(), label: 'Mx', value: 'mx' },
          { id: nanoid(), label: 'Dr', value: 'dr' },
          { id: nanoid(), label: 'Other', value: 'other' },
        ],
      },
    },
  ],

  // ============================================
  // ADVANCED FIELD TYPES
  // ============================================
  advanced: [
    {
      id: 'documentUpload',
      name: 'Document Upload',
      description: 'File upload field for documents (PDF, images, etc.)',
      category: 'Advanced',
      tags: ['file', 'upload', 'document'],
      icon: '📎',
      popular: true,
      fieldConfig: {
        id: 'documentUpload',
        type: 'file-upload',
        label: 'Upload Documents',
        // maxFiles: 3,
        maxFileSize: 10,
        validation: { required: false },
      },
    },
    {
      id: 'satisfactionMatrix',
      name: 'Satisfaction Matrix',
      description: 'Matrix question for rating multiple items',
      category: 'Advanced',
      tags: ['matrix', 'rating', 'satisfaction'],
      icon: '📊',
      popular: true,
      fieldConfig: {
        id: 'satisfactionMatrix',
        type: 'matrix-single',
        label: 'Please rate the following aspects of your experience',
        validation: { required: true },
      } as any,
    },
    {
      id: 'painScale',
      name: 'Visual Pain Scale',
      description: 'Visual analog pain scale (0-10) for healthcare',
      category: 'Advanced',
      tags: ['pain', 'scale', 'healthcare', 'visual'],
      icon: '🩹',
      popular: true,
      fieldConfig: {
        id: 'painLevel',
        type: 'pain-scale',
        label: 'Please indicate your current pain level',
        validation: { required: true },
      },
    },
    {
      id: 'medicationList',
      name: 'Medication List',
      description: 'Multi-text field for listing multiple medications',
      category: 'Advanced',
      tags: ['medication', 'list', 'healthcare'],
      icon: '💊',
      popular: true,
      fieldConfig: {
        id: 'currentMedications',
        type: 'multi-text',
        label: 'Current Medications (add as many as needed)',
        placeholder: 'Enter medication name and dosage',
      },
    },
    {
      id: 'treatmentRanking',
      name: 'Treatment Priority Ranking',
      description: 'Drag-to-rank field for prioritizing options',
      category: 'Advanced',
      tags: ['ranking', 'priority', 'order'],
      icon: '📋',
      popular: false,
      fieldConfig: {
        id: 'treatmentPriorities',
        type: 'ranking',
        label: 'Rank these treatment priorities from most to least important',
        options: [
          { id: nanoid(), label: 'Pain management', value: 'pain-management' },
          { id: nanoid(), label: 'Reducing hospital visits', value: 'reducing-visits' },
          { id: nanoid(), label: 'Improving quality of life', value: 'quality-of-life' },
          { id: nanoid(), label: 'Preventing complications', value: 'preventing-complications' },
        ],
        validation: { required: true },
      },
    },
    {
      id: 'likertAgreement',
      name: 'Likert Agreement Scale',
      description: 'Standard 5-point agreement scale',
      category: 'Advanced',
      tags: ['likert', 'agreement', 'scale'],
      icon: '⚖️',
      popular: true,
      fieldConfig: {
        id: 'agreementLevel',
        type: 'likert-scale',
        label: 'I feel my healthcare providers listen to my concerns',
        validation: { required: true },
      },
    },
    {
      id: 'appointmentDateTime',
      name: 'Appointment Date & Time',
      description: 'Combined date and time picker',
      category: 'Advanced',
      tags: ['datetime', 'appointment', 'scheduling'],
      icon: '📅',
      popular: false,
      fieldConfig: {
        id: 'preferredAppointment',
        type: 'datetime',
        label: 'Preferred Appointment Date & Time',
        validation: { required: true },
      },
    },
    {
      id: 'percentageField',
      name: 'Percentage Input',
      description: 'Percentage field with 0-100% validation',
      category: 'Advanced',
      tags: ['percentage', 'number'],
      icon: '%',
      popular: false,
      fieldConfig: {
        id: 'improvementPercentage',
        type: 'percentage',
        label: 'What percentage of improvement have you experienced?',
        validation: { required: true },
      },
    },
    {
      id: 'currencyAmount',
      name: 'Currency Amount',
      description: 'Currency input with CAD prefix',
      category: 'Advanced',
      tags: ['currency', 'money', 'amount'],
      icon: '💰',
      popular: false,
      fieldConfig: {
        id: 'outOfPocketCosts',
        type: 'currency',
        label: 'Estimated out-of-pocket costs',
        // prefix: '$', // Not in base FieldConfig
        // suffix: 'CAD',
      },
    },
  ],

  // ============================================
  // COMMUNICATION PREFERENCES
  // ============================================
  communication: [
    {
      id: 'preferredContactMethod',
      name: 'Preferred Contact Method',
      description: 'How user prefers to be contacted',
      category: 'Communication',
      tags: ['contact', 'preference', 'method'],
      icon: '📱',
      popular: true,
      fieldConfig: {
        id: 'preferredContactMethod',
        type: 'radio',
        label: 'Preferred method of contact',
        validation: { required: true },
        options: [
          { id: nanoid(), label: 'Email', value: 'email' },
          { id: nanoid(), label: 'Phone (Text/Phone call)', value: 'phone' },
          { id: nanoid(), label: 'Either', value: 'either' },
        ],
      },
    },
    {
      id: 'joinMailingList',
      name: 'Join Mailing List',
      description: 'Whether user wants to join mailing list',
      category: 'Communication',
      tags: ['mailing', 'newsletter', 'subscription'],
      icon: '📧',
      popular: false,
      fieldConfig: {
        id: 'joinMailingList',
        type: 'radio',
        label: 'Would you like to join our mailing list for updates and newsletters?',
        validation: { required: true },
        options: [
          { id: nanoid(), label: 'Yes', value: 'yes' },
          { id: nanoid(), label: 'No', value: 'no' },
        ],
      },
    },
  ],
};

/**
 * Flatten question bank for easy searching
 */
export const allQuestions: QuestionTemplate[] = Object.values(questionBank).flat();

/**
 * Get questions by category
 */
export function getQuestionsByCategory(category: string): QuestionTemplate[] {
  return allQuestions.filter(q => q.category === category);
}

/**
 * Get popular questions
 */
export function getPopularQuestions(): QuestionTemplate[] {
  return allQuestions.filter(q => q.popular);
}

/**
 * Search questions by keyword
 */
export function searchQuestions(keyword: string): QuestionTemplate[] {
  const lowerKeyword = keyword.toLowerCase();
  return allQuestions.filter(q =>
    q.name.toLowerCase().includes(lowerKeyword) ||
    q.description.toLowerCase().includes(lowerKeyword) ||
    q.tags.some(tag => tag.toLowerCase().includes(lowerKeyword))
  );
}

/**
 * Get all unique categories
 */
export function getCategories(): string[] {
  return Array.from(new Set(allQuestions.map(q => q.category)));
}

/**
 * Get all unique tags
 */
export function getAllTags(): string[] {
  return Array.from(new Set(allQuestions.flatMap(q => q.tags)));
}
