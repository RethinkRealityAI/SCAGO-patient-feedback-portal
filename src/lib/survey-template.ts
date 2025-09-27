import { nanoid } from 'nanoid';

// NOTE: The 'id' of each field must match the camelCase property name
// in the FeedbackSubmission interface (src/app/dashboard/types.ts)

const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map(String);
const months = [
  'January', 'February', 'March', 'April', 'May', 'June', 
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const defaultSurvey = {
  appearance: {
    themeColor: '#C8262A',
    cardShadow: 'sm',
    cardTitleSize: 'lg',
    sectionTitleSize: 'lg',
    labelSize: 'sm',
    gradient: true,
  },
  title: 'Patient Feedback Survey',
  description: 'The following information will help us understand the scope of the situation. Kindly provide as much information as you can.',
  // New: submission and sharing defaults
  submitButtonLabel: 'Submit',
  saveProgressEnabled: true,
  shareButtonEnabled: true,
  shareTitle: 'Share this survey',
  shareText: 'I’d like your feedback—please fill out this survey.',
  sections: [
    {
        id: 'contact-information-section',
        title: 'Contact Information',
        fields: [
            { id: 'submitAnonymously', type: 'anonymous-toggle', label: 'Submit anonymously' },
            {
                id: 'name-group',
                type: 'group',
                fields: [
                    { id: 'firstName', type: 'text', label: 'First name' },
                    { id: 'lastName', type: 'text', label: 'Last name' },
                ]
            },
            {
                id: 'contact-group',
                type: 'group',
                fields: [
                    { id: 'email', type: 'email', label: 'Email' },
                    { id: 'phone', type: 'text', label: 'Phone' },
                ]
            },
            {
                id: 'location-group',
                type: 'group',
                fields: [
                    { id: 'city', type: 'city-on', label: 'City' },
                    { id: 'province', type: 'province-ca', label: 'Province' },
                ]
            }
        ]
    },
    {
      id: 'quality-of-care-section',
      title: 'Section 1: Perception Around Quality of Care',
      description: 'Please provide as much information as you can.',
      fields: [
        {
          id: 'patientOrCaregiver',
          label: 'Are you a patient or a caregiver?',
          type: 'select',
          options: [
            { id: nanoid(), label: 'Patient', value: 'patient' },
            { id: nanoid(), label: 'Caregiver', value: 'caregiver' },
          ],
        },
        {
            id: 'provider-names-group',
            type: 'group',
            fields: [
                {
                  id: 'physicianName',
                  label: 'Name of Physician',
                  type: 'text',
                  placeholder: 'Dr. Smith',
                },
                {
                  id: 'triageNurseName',
                  label: 'Name of Triage Nurse',
                  type: 'text',
                  placeholder: 'Nurse Jackie',
                },
            ]
        },
        {
          id: 'firstReception',
          label: 'How was the reception with the FIRST person encountered? (Such as triage RN?)',
          type: 'textarea',
        },
        {
          id: 'visitReason',
          label: 'Reason for this visit? (e.g., pain, fever, surgery, regular visit)',
          type: 'text',
        },
        {
          id: 'inPainCrisis',
          label: 'Were you in the hospital for pain crisis?',
          type: 'radio',
          options: [
            { id: nanoid(), label: 'Yes', value: 'yes' },
            { id: nanoid(), label: 'No', value: 'no' },
          ],
        },
        {
          id: 'timeToAnalgesia',
          label: 'If for pain crisis, how long before the first analgesia was administered?',
          type: 'duration-hm',
          conditionField: 'inPainCrisis',
          conditionValue: 'yes',
        },
        {
          id: 'admittedToWard',
          label: 'Were you admitted to inpatient ward?',
          type: 'radio',
          options: [
            { id: nanoid(), label: 'Yes', value: 'yes' },
            { id: nanoid(), label: 'No', value: 'no' },
          ],
        },
        {
          id: 'hospitalStayLength',
          label: 'How long was your hospital stay?',
          type: 'time-amount',
        },
        {
          id: 'hcpFamiliarity',
          label: 'How familiar were the health care providers (HCP) with your condition?',
          type: 'select',
          options: [
            { id: nanoid(), label: 'Very Familiar', value: 'very-familiar' },
            { id: nanoid(), label: 'Somewhat Familiar', value: 'somewhat-familiar' },
            { id: nanoid(), label: 'Not at all Familiar', value: 'not-at-all-familiar' },
          ],
        },
        {
          id: 'hcpRespectfulness',
          label: 'How respectful were the HCPs of your needs and concerns?',
          type: 'textarea',
        },
        {
          id: 'experienced',
          label: 'Did you experience any of the following AS A RESULT of you seeking treatment during this interaction?',
          type: 'radio',
          options: [
            { id: nanoid(), label: 'Stigmatization or stereotyping', value: 'stigmatization-stereotyping' },
            { id: nanoid(), label: 'Anxiety', value: 'anxiety' },
            { id: nanoid(), label: 'Helplessness or Isolation', value: 'helplessness-isolation' },
            { id: nanoid(), label: 'Other', value: 'other' },
          ],
        },
        {
            id: 'experiencedOther',
            label: 'If other, please specify:',
            type: 'text',
            conditionField: 'experienced',
            conditionValue: 'other',
        }
      ],
    },
    {
      id: 'hospital-experience-section',
      title: 'Section 2: Hospital Experience in Detail',
      description: 'Please provide details about your hospital experience.',
      fields: [
        {
            id: 'interaction-date-group',
            type: 'group',
            fields: [
                {
                  id: 'interactionDate',
                  label: 'Date of Interaction',
                  type: 'date',
                },
            ]
        },
        {
            id: 'hospitalName',
            label: 'Hospital Name',
            type: 'hospital-on',
        },
        {
            id: 'hospitalUnit',
            label: 'Unit or Department',
            type: 'select',
            options: [
                { id: nanoid(), label: 'Emergency Room', value: 'emergency-room' },
                { id: nanoid(), label: 'Outpatient', value: 'outpatient' },
                { id: nanoid(), label: 'On admission', value: 'on-admission' },
                { id: nanoid(), label: 'Other', value: 'other' },
            ]
        },
        {
            id: 'clinicianNames',
            label: 'Name of Physician, Nurse and other clinicians providing optimal or sub-optimal care',
            type: 'textarea',
        },
        {
            id: 'hospitalInteraction',
            label: 'Your Experience',
            type: 'textarea',
        },
        {
          id: 'timelyMedications',
          label: 'Did you receive timely medications while in the hospital?',
          type: 'radio',
          options: [
            { id: nanoid(), label: 'Yes', value: 'yes' },
            { id: nanoid(), label: 'No', value: 'no' },
          ],
        },
        {
            id: 'rightInvestigationConducted',
            label: 'Did you feel the right investigation/tests were conducted?',
            type: 'select',
            options: [
                { id: nanoid(), label: 'Yes', value: 'yes' },
                { id: nanoid(), label: 'No', value: 'no' },
                { id: nanoid(), label: 'Not Applicable', value: 'not-applicable' },
            ]
        },
        {
            id: 'concernsAddressed',
            label: 'Did you feel your concerns were well addressed?',
            type: 'select',
            options: [
                { id: nanoid(), label: 'Yes', value: 'yes' },
                { id: nanoid(), label: 'No', value: 'no' },
                { id: nanoid(), label: 'Not Applicable', value: 'not-applicable' },
            ]
        },
        {
            id: 'optimalTime',
            label: 'Did you feel that you had an optimal amount of time?',
            type: 'select',
            options: [
                { id: nanoid(), label: 'Yes', value: 'yes' },
                { id: nanoid(), label: 'No', value: 'no' },
                { id: nanoid(), label: 'Not Applicable', value: 'not-applicable' },
            ]
        },
        {
          id: 'reportedToHospital',
          label: 'Did you report this situation to the hospital?',
          type: 'select',
          conditionField: 'concernsAddressed',
          conditionValue: 'no',
          options: [
            { id: nanoid(), label: 'Yes', value: 'yes' },
            { id: nanoid(), label: 'No', value: 'no' },
          ],
        },
        {
          id: 'reportOutcome',
          label: 'If “Yes”, what was the outcome of your report?',
          type: 'textarea',
          conditionField: 'reportedToHospital',
          conditionValue: 'yes',
        },
        {
          id: 'reportNotDoneReason',
          label: 'If “No”, why not?',
          type: 'select',
          conditionField: 'reportedToHospital',
          conditionValue: 'no',
          options: [
            { id: nanoid(), label: 'Not aware of complaint process', value: 'not-aware' },
            { id: nanoid(), label: 'Not comfortable', value: 'not-comfortable' },
            { id: nanoid(), label: 'Other', value: 'other' },
          ],
        },
        {
            id: 'reportNotDoneReasonOther',
            label: 'If other, please specify:',
            type: 'text',
            conditionField: 'reportNotDoneReason',
            conditionValue: 'other',
        },
        {
            id: 'anythingElseToKnow',
            label: 'Is there anything else would you like us to know about this hospital interaction?',
            type: 'textarea',
        },
        {
          id: 'rating',
          label: 'On a scale of 1-10, what would you rate the quality of care you received?',
          type: 'nps',
        },
      ],
    },
  ],
};
