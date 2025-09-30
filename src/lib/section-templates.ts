import { nanoid } from 'nanoid';

/**
 * Predefined section templates for quick survey creation
 * Each template includes a complete section configuration
 */

export const sectionTemplates = {
  basicInformation: {
    id: nanoid(),
    title: 'Basic Information',
    description: 'Please provide your contact information',
    fields: [
      {
        id: 'name-group',
        type: 'group',
        label: 'Name',
        fields: [
          { id: 'firstName', type: 'text', label: 'First Name', validation: { required: true } },
          { id: 'lastName', type: 'text', label: 'Last Name', validation: { required: true } },
        ],
      },
      {
        id: 'contact-group',
        type: 'group',
        label: 'Contact Information',
        fields: [
          { id: 'email', type: 'email', label: 'Email', validation: { required: true } },
          { id: 'phone', type: 'phone', label: 'Phone', validation: { required: true } },
        ],
      },
      {
        id: 'location-group',
        type: 'group',
        label: 'Location',
        fields: [
          { id: 'city', type: 'city-on', label: 'City', validation: { required: true } },
          { id: 'province', type: 'province-ca', label: 'Province', validation: { required: true } },
        ],
      },
    ],
  },

  hospitalExperience: {
    id: nanoid(),
    title: 'Hospital Experience',
    description: 'Tell us about your recent hospital visit',
    fields: [
      {
        id: 'visit-date-hospital-group',
        type: 'group',
        label: 'Visit Details',
        fields: [
          { id: 'visitDate', type: 'date', label: 'Date of Visit', validation: { required: true } },
          { id: 'hospitalName', type: 'hospital-on', label: 'Hospital Name', validation: { required: true } },
        ],
      },
      {
        id: 'department',
        type: 'department-on',
        label: 'Department or Service',
        validation: { required: true },
      },
      {
        id: 'experienceDescription',
        type: 'textarea',
        label: 'Please describe your experience',
        validation: { required: true },
      },
      {
        id: 'rating',
        type: 'rating',
        label: 'How would you rate your overall experience?',
        validation: { required: true },
      },
    ],
  },

  demographics: {
    id: nanoid(),
    title: 'Demographics',
    description: 'Optional demographic information',
    fields: [
      {
        id: 'age-gender-group',
        type: 'group',
        label: 'Demographics',
        fields: [
          {
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
          {
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
        ],
      },
      {
        id: 'ethnicity',
        type: 'select',
        label: 'Ethnicity (optional)',
        options: [
          { id: nanoid(), label: 'Prefer not to say', value: 'prefer-not-to-say' },
          { id: nanoid(), label: 'Black/African', value: 'black-african' },
          { id: nanoid(), label: 'Caribbean', value: 'caribbean' },
          { id: nanoid(), label: 'Asian', value: 'asian' },
          { id: nanoid(), label: 'White/Caucasian', value: 'white-caucasian' },
          { id: nanoid(), label: 'Hispanic/Latino', value: 'hispanic-latino' },
          { id: nanoid(), label: 'Indigenous', value: 'indigenous' },
          { id: nanoid(), label: 'Middle Eastern', value: 'middle-eastern' },
          { id: nanoid(), label: 'Mixed/Multiple', value: 'mixed-multiple' },
          { id: nanoid(), label: 'Other', value: 'other' },
        ],
      },
    ],
  },

  consentConfirmation: {
    id: nanoid(),
    title: 'Consent and Confirmation',
    description: 'Please confirm your consent to participate',
    fields: [
      {
        id: 'ageConfirmation',
        type: 'boolean-checkbox',
        label: 'I confirm that I am 18 years of age or older',
        validation: { required: true },
      },
      {
        id: 'consentToParticipate',
        type: 'boolean-checkbox',
        label: 'I consent to participate in this survey and understand how my data will be used',
        validation: { required: true },
      },
      {
        id: 'signature-date-group',
        type: 'group',
        label: 'Signature',
        fields: [
          { id: 'digitalSignature', type: 'digital-signature', label: 'Full Name (Digital Signature)', validation: { required: true } },
          { id: 'signatureDate', type: 'date', label: 'Date', validation: { required: true } },
        ],
      },
    ],
  },

  feedbackComments: {
    id: nanoid(),
    title: 'Additional Feedback',
    description: 'Is there anything else you would like to share?',
    fields: [
      {
        id: 'additionalComments',
        type: 'textarea',
        label: 'Additional Comments or Suggestions',
      },
      {
        id: 'followUpConsent',
        type: 'radio',
        label: 'May we contact you for follow-up?',
        options: [
          { id: nanoid(), label: 'Yes', value: 'yes' },
          { id: nanoid(), label: 'No', value: 'no' },
        ],
      },
    ],
  },

  scagoConsentNotice: {
    id: nanoid(),
    title: 'About SCAGO & Consent to Participate',
    description: 'SCAGO has been creating and delivering evidence-based supports and services across Ontario since 2005. SCAGO offers non-medical support services only. If you require urgent medical attention, please contact your healthcare provider or call 911. Note: This form is for individuals aged 18 or older. If you are under 18, a parent or guardian must complete this form on your behalf.',
    fields: [
      {
        id: 'ageConfirmation',
        type: 'boolean-checkbox',
        label: 'I confirm that I am 18 years of age or older, OR I am a parent/guardian completing this form on behalf of someone under 18',
        validation: { required: true },
      },
    ],
  },

  scagoBasicInformation: {
    id: nanoid(),
    title: 'Basic Information',
    fields: [
      {
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
      {
        id: 'titleOther',
        type: 'text',
        label: 'If other, please specify',
        conditionField: 'title',
        conditionValue: 'other',
        validation: { required: true },
      },
      {
        id: 'consent-name-group',
        type: 'group',
        fields: [
          { id: 'firstName', type: 'text', label: 'First Name', validation: { required: true } },
          { id: 'lastName', type: 'text', label: 'Last Name', validation: { required: true } },
        ],
      },
      {
        id: 'consent-contact-group',
        type: 'group',
        fields: [
          { id: 'email', type: 'email', label: 'Email Address', validation: { required: true } },
          { id: 'phone', type: 'phone', label: 'Phone Number (Cell)', validation: { required: true } },
        ],
      },
      {
        id: 'streetAddress',
        type: 'text',
        label: 'Street Address',
        validation: { required: true },
      },
      {
        id: 'consent-location-group',
        type: 'group',
        fields: [
          { id: 'city', type: 'city-on', label: 'City', validation: { required: true } },
          { id: 'province', type: 'province-ca', label: 'Province', validation: { required: true } },
        ],
      },
      {
        id: 'postalCode',
        type: 'text',
        label: 'Postal Code',
        validation: { required: true },
      },
    ],
  },

  scagoScdConnection: {
    id: nanoid(),
    title: 'Your Connection to Sickle Cell Disease',
    fields: [
      {
        id: 'scdConnection',
        type: 'checkbox',
        label: 'Please select all that apply',
        validation: { required: true },
        options: [
          { id: nanoid(), label: 'I have sickle cell disease', value: 'i-have-scd' },
          { id: nanoid(), label: 'My child has sickle cell disease', value: 'my-child-has-scd' },
          { id: nanoid(), label: 'I am a caregiver or family member', value: 'caregiver-family' },
          { id: nanoid(), label: 'I am a healthcare provider', value: 'healthcare-provider' },
          { id: nanoid(), label: 'Other', value: 'other' },
        ],
      },
      {
        id: 'scdConnectionOther',
        type: 'text',
        label: 'If you selected "Other" above, please describe',
      },
      {
        id: 'individual1-group',
        type: 'group',
        fields: [
          { id: 'individual1Name', type: 'text', label: 'Individual 1 - Name' },
          { id: 'individual1DOB', type: 'date', label: 'Individual 1 - Date of Birth' },
        ],
      },
      {
        id: 'individual2-group',
        type: 'group',
        fields: [
          { id: 'individual2Name', type: 'text', label: 'Individual 2 - Name' },
          { id: 'individual2DOB', type: 'date', label: 'Individual 2 - Date of Birth' },
        ],
      },
      {
        id: 'individual3-group',
        type: 'group',
        fields: [
          { id: 'individual3Name', type: 'text', label: 'Individual 3 - Name' },
          { id: 'individual3DOB', type: 'date', label: 'Individual 3 - Date of Birth' },
        ],
      },
    ],
  },

  scagoCareInformation: {
    id: nanoid(),
    title: 'Care Information',
    fields: [
      {
        id: 'primaryHospital',
        type: 'hospital-on',
        label: 'Which hospital(s) do you/your child primarily receive care from for SCD?',
        validation: { required: true },
      },
    ],
  },

  scagoStayConnected: {
    id: nanoid(),
    title: 'Stay Connected',
    fields: [
      {
        id: 'mayContact',
        type: 'radio',
        label: 'May we contact you about SCAGO services, programs, or events?',
        validation: { required: true },
        options: [
          { id: nanoid(), label: 'Yes', value: 'yes' },
          { id: nanoid(), label: 'No', value: 'no' },
        ],
      },
      {
        id: 'preferredContactMethod',
        type: 'radio',
        label: 'Preferred method of contact',
        conditionField: 'mayContact',
        conditionValue: 'yes',
        validation: { required: true },
        options: [
          { id: nanoid(), label: 'Email', value: 'email' },
          { id: nanoid(), label: 'Phone (Text/Phone call)', value: 'phone' },
          { id: nanoid(), label: 'Either', value: 'either' },
        ],
      },
      {
        id: 'joinMailingList',
        type: 'radio',
        label: 'Would you like to join SCAGO\'s mailing list for updates, newsletters, and advocacy news?',
        validation: { required: true },
        options: [
          { id: nanoid(), label: 'Yes', value: 'yes' },
          { id: nanoid(), label: 'No', value: 'no' },
        ],
      },
      {
        id: 'joinSupportGroups',
        type: 'radio',
        label: 'Would you like to join our WhatsApp or face-to-face support groups?',
        validation: { required: true },
        options: [
          { id: nanoid(), label: 'Yes', value: 'yes' },
          { id: nanoid(), label: 'No', value: 'no' },
        ],
      },
      {
        id: 'supportGroupContactMethod',
        type: 'radio',
        label: 'How should we contact you about support groups?',
        conditionField: 'joinSupportGroups',
        conditionValue: 'yes',
        validation: { required: true },
        options: [
          { id: nanoid(), label: 'Email', value: 'email' },
          { id: nanoid(), label: 'Phone', value: 'phone' },
          { id: nanoid(), label: 'Either', value: 'either' },
        ],
      },
      {
        id: 'consentToAdvocacy',
        type: 'radio',
        label: 'Do you consent to a SCAGO staff member or Patient Well-Being Coordinator advocating on your behalf when requested?',
        validation: { required: true },
        options: [
          { id: nanoid(), label: 'Yes', value: 'yes' },
          { id: nanoid(), label: 'No', value: 'no' },
        ],
      },
    ],
  },
};

/**
 * Metadata for section templates (for UI display)
 */
export const sectionTemplateMetadata = [
  {
    key: 'basicInformation',
    name: 'Basic Information',
    description: 'Contact details with name, email, phone, and location',
    icon: '👤',
    category: 'Contact',
  },
  {
    key: 'hospitalExperience',
    name: 'Hospital Experience',
    description: 'Visit details, department, description, and rating',
    icon: '🏥',
    category: 'Healthcare',
  },
  {
    key: 'demographics',
    name: 'Demographics',
    description: 'Age range, gender, and ethnicity',
    icon: '📊',
    category: 'Demographics',
  },
  {
    key: 'consentConfirmation',
    name: 'Consent & Confirmation',
    description: 'Age confirmation, consent checkbox, and digital signature',
    icon: '✅',
    category: 'Legal',
  },
  {
    key: 'feedbackComments',
    name: 'Additional Feedback',
    description: 'Comments section and follow-up consent',
    icon: '💬',
    category: 'Feedback',
  },
  {
    key: 'scagoConsentNotice',
    name: 'SCAGO Consent Notice',
    description: 'About SCAGO and consent to participate',
    icon: '📋',
    category: 'Consent',
  },
  {
    key: 'scagoBasicInformation',
    name: 'SCAGO Basic Information',
    description: 'Title, name, contact, and address information',
    icon: '👤',
    category: 'Consent',
  },
  {
    key: 'scagoScdConnection',
    name: 'SCAGO SCD Connection',
    description: 'Connection to sickle cell disease and family members',
    icon: '🔗',
    category: 'Consent',
  },
  {
    key: 'scagoCareInformation',
    name: 'SCAGO Care Information',
    description: 'Primary hospital for SCD care',
    icon: '🏥',
    category: 'Consent',
  },
  {
    key: 'scagoStayConnected',
    name: 'SCAGO Stay Connected',
    description: 'Contact preferences and support group participation',
    icon: '📞',
    category: 'Consent',
  },
] as const;

export type SectionTemplateKey = keyof typeof sectionTemplates;
