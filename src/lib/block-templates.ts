import { nanoid } from 'nanoid';

/**
 * Block templates - predefined field combinations with grid layouts
 * Each block represents a common field pattern
 */

export type GridPattern = '1x1' | '2x1' | '3x1' | '2x2' | '4x1' | '1x2';

export interface BlockTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  gridPattern: GridPattern;
  fields: Array<{
    id: string;
    type: string;
    label: string;
    validation?: { required?: boolean };
    options?: Array<{ id: string; label: string; value: string }>;
  }>;
}

/**
 * Grid pattern visual representations for UI
 */
export const gridPatterns = [
  {
    pattern: '1x1' as GridPattern,
    name: 'Single Field',
    icon: '⬜',
    columns: 1,
    description: 'One full-width field',
  },
  {
    pattern: '2x1' as GridPattern,
    name: 'Two Side-by-Side',
    icon: '⬜⬜',
    columns: 2,
    description: 'Two fields in a row',
  },
  {
    pattern: '3x1' as GridPattern,
    name: 'Three Side-by-Side',
    icon: '⬜⬜⬜',
    columns: 3,
    description: 'Three fields in a row',
  },
  {
    pattern: '4x1' as GridPattern,
    name: 'Four Side-by-Side',
    icon: '⬜⬜⬜⬜',
    columns: 4,
    description: 'Four fields in a row',
  },
  {
    pattern: '2x2' as GridPattern,
    name: '2x2 Grid',
    icon: '⬜⬜\n⬜⬜',
    columns: 2,
    description: 'Four fields in 2x2 grid',
  },
  {
    pattern: '1x2' as GridPattern,
    name: 'Two Stacked',
    icon: '⬜\n⬜',
    columns: 1,
    description: 'Two fields stacked',
  },
] as const;

/**
 * Predefined block templates for common field combinations
 */
export const blockTemplates: Record<string, BlockTemplate> = {
  nameFields: {
    id: nanoid(),
    name: 'Name Fields',
    description: 'First name and last name side-by-side',
    icon: '👤',
    gridPattern: '2x1',
    fields: [
      { id: 'firstName', type: 'text', label: 'First Name', validation: { required: true } },
      { id: 'lastName', type: 'text', label: 'Last Name', validation: { required: true } },
    ],
  },

  contactFields: {
    id: nanoid(),
    name: 'Contact Fields',
    description: 'Email and phone side-by-side',
    icon: '📧',
    gridPattern: '2x1',
    fields: [
      { id: 'email', type: 'email', label: 'Email', validation: { required: true } },
      { id: 'phone', type: 'phone', label: 'Phone', validation: { required: true } },
    ],
  },

  locationFields: {
    id: nanoid(),
    name: 'Location Fields',
    description: 'City and province side-by-side',
    icon: '📍',
    gridPattern: '2x1',
    fields: [
      { id: 'city', type: 'city-on', label: 'City', validation: { required: true } },
      { id: 'province', type: 'province-ca', label: 'Province', validation: { required: true } },
    ],
  },

  fullAddress: {
    id: nanoid(),
    name: 'Full Address',
    description: 'Street, city, province, postal code',
    icon: '🏠',
    gridPattern: '2x2',
    fields: [
      { id: 'streetAddress', type: 'text', label: 'Street Address', validation: { required: true } },
      { id: 'city', type: 'city-on', label: 'City', validation: { required: true } },
      { id: 'province', type: 'province-ca', label: 'Province', validation: { required: true } },
      { id: 'postalCode', type: 'text', label: 'Postal Code', validation: { required: true } },
    ],
  },

  dateTimeFields: {
    id: nanoid(),
    name: 'Date & Time',
    description: 'Date and time fields side-by-side',
    icon: '📅',
    gridPattern: '2x1',
    fields: [
      { id: 'date', type: 'date', label: 'Date', validation: { required: true } },
      { id: 'time', type: 'time', label: 'Time', validation: { required: true } },
    ],
  },

  hospitalVisit: {
    id: nanoid(),
    name: 'Hospital Visit',
    description: 'Hospital name and department',
    icon: '🏥',
    gridPattern: '2x1',
    fields: [
      { id: 'hospitalName', type: 'hospital-on', label: 'Hospital Name', validation: { required: true } },
      { id: 'department', type: 'department-on', label: 'Department', validation: { required: true } },
    ],
  },

  yesNoQuestions: {
    id: nanoid(),
    name: 'Yes/No Questions',
    description: 'Two yes/no radio questions',
    icon: '✓✗',
    gridPattern: '2x1',
    fields: [
      {
        id: 'question1',
        type: 'radio',
        label: 'Question 1',
        validation: { required: true },
        options: [
          { id: nanoid(), label: 'Yes', value: 'yes' },
          { id: nanoid(), label: 'No', value: 'no' },
        ],
      },
      {
        id: 'question2',
        type: 'radio',
        label: 'Question 2',
        validation: { required: true },
        options: [
          { id: nanoid(), label: 'Yes', value: 'yes' },
          { id: nanoid(), label: 'No', value: 'no' },
        ],
      },
    ],
  },

  ratingScales: {
    id: nanoid(),
    name: 'Rating Scales',
    description: 'Two rating fields side-by-side',
    icon: '⭐',
    gridPattern: '2x1',
    fields: [
      { id: 'rating1', type: 'rating', label: 'Rating 1', validation: { required: true } },
      { id: 'rating2', type: 'rating', label: 'Rating 2', validation: { required: true } },
    ],
  },

  scagoTitleSelection: {
    id: nanoid(),
    name: 'SCAGO Title Selection',
    description: 'Title selection with other option',
    icon: '👤',
    gridPattern: '1x1',
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
    ],
  },

  scagoScdConnectionOptions: {
    id: nanoid(),
    name: 'SCAGO SCD Connection',
    description: 'Connection to sickle cell disease options',
    icon: '🔗',
    gridPattern: '1x1',
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
    ],
  },

  scagoContactPreferences: {
    id: nanoid(),
    name: 'SCAGO Contact Preferences',
    description: 'Contact method preferences',
    icon: '📞',
    gridPattern: '2x1',
    fields: [
      {
        id: 'mayContact',
        type: 'radio',
        label: 'May we contact you about SCAGO services?',
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
        validation: { required: true },
        options: [
          { id: nanoid(), label: 'Email', value: 'email' },
          { id: nanoid(), label: 'Phone (Text/Phone call)', value: 'phone' },
          { id: nanoid(), label: 'Either', value: 'either' },
        ],
      },
    ],
  },

  scagoSupportGroups: {
    id: nanoid(),
    name: 'SCAGO Support Groups',
    description: 'Support group participation preferences',
    icon: '👥',
    gridPattern: '2x1',
    fields: [
      {
        id: 'joinMailingList',
        type: 'radio',
        label: 'Join SCAGO mailing list?',
        validation: { required: true },
        options: [
          { id: nanoid(), label: 'Yes', value: 'yes' },
          { id: nanoid(), label: 'No', value: 'no' },
        ],
      },
      {
        id: 'joinSupportGroups',
        type: 'radio',
        label: 'Join support groups?',
        validation: { required: true },
        options: [
          { id: nanoid(), label: 'Yes', value: 'yes' },
          { id: nanoid(), label: 'No', value: 'no' },
        ],
      },
    ],
  },

  scagoDigitalSignature: {
    id: nanoid(),
    name: 'SCAGO Digital Signature',
    description: 'Digital signature and date',
    icon: '✍️',
    gridPattern: '2x1',
    fields: [
      { id: 'digitalSignature', type: 'digital-signature', label: 'Full Name (Digital Signature)', validation: { required: true } },
      { id: 'signatureDate', type: 'date', label: 'Date', validation: { required: true } },
    ],
  },
};

/**
 * Metadata for block templates (for UI display)
 */
export const blockTemplateMetadata = [
  {
    key: 'nameFields',
    category: 'Contact',
    popular: true,
  },
  {
    key: 'contactFields',
    category: 'Contact',
    popular: true,
  },
  {
    key: 'locationFields',
    category: 'Location',
    popular: true,
  },
  {
    key: 'fullAddress',
    category: 'Location',
    popular: false,
  },
  {
    key: 'dateTimeFields',
    category: 'Date & Time',
    popular: false,
  },
  {
    key: 'hospitalVisit',
    category: 'Healthcare',
    popular: true,
  },
  {
    key: 'yesNoQuestions',
    category: 'Questions',
    popular: false,
  },
  {
    key: 'ratingScales',
    category: 'Feedback',
    popular: false,
  },
  {
    key: 'scagoTitleSelection',
    category: 'Consent',
    popular: true,
  },
  {
    key: 'scagoScdConnectionOptions',
    category: 'Consent',
    popular: true,
  },
  {
    key: 'scagoContactPreferences',
    category: 'Consent',
    popular: true,
  },
  {
    key: 'scagoSupportGroups',
    category: 'Consent',
    popular: false,
  },
  {
    key: 'scagoDigitalSignature',
    category: 'Consent',
    popular: true,
  },
] as const;

export type BlockTemplateKey = keyof typeof blockTemplates;

/**
 * Helper to create a blank field template for custom groups
 */
export function createBlankFields(pattern: GridPattern): Array<{ id: string; type: string; label: string }> {
  const counts: Record<GridPattern, number> = {
    '1x1': 1,
    '2x1': 2,
    '3x1': 3,
    '4x1': 4,
    '2x2': 4,
    '1x2': 2,
  };

  const count = counts[pattern];
  return Array.from({ length: count }, (_, i) => ({
    id: `field${i + 1}`,
    type: 'text',
    label: `Field ${i + 1}`,
  }));
}
