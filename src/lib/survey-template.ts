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
    showTitle: true,
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
          id: 'visitReason',
          label: 'Reason for this visit? (e.g., fever, surgery, if other please specify)',
          type: 'text',
          conditionField: 'inPainCrisis',
          conditionValue: 'no',
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
          label: 'Did you experience any of the following AS A RESULT of you seeking treatment during this interaction? (Select all that apply)',
          type: 'checkbox',
          options: [
            { id: nanoid(), label: 'Stigmatization or stereotyping', value: 'stigmatization-stereotyping' },
            { id: nanoid(), label: 'Anxiety', value: 'anxiety' },
            { id: nanoid(), label: 'Helplessness or Isolation', value: 'helplessness-isolation' },
            { id: nanoid(), label: 'Disrespect', value: 'disrespect' },
            { id: nanoid(), label: 'Bullying', value: 'bullying' },
            { id: nanoid(), label: 'Attentiveness', value: 'attentiveness' },
            { id: nanoid(), label: 'Compassion/empathy', value: 'compassion-empathy' },
            { id: nanoid(), label: 'Understanding', value: 'understanding' },
            { id: nanoid(), label: 'Other', value: 'other' },
          ],
        },
        {
            id: 'experiencedOther',
            label: 'Please elaborate:',
            type: 'textarea',
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
            id: 'department',
            label: 'Department or Service',
            type: 'department-on',
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
            id: 'rightInvestigationRationale',
            label: 'Please provide details:',
            type: 'textarea',
            conditionField: 'rightInvestigationConducted',
            conditionValue: 'no',
        },
        {
            id: 'timelyManner',
            label: 'Did you feel you were attended to in a timely manner?',
            type: 'select',
            options: [
                { id: nanoid(), label: 'Yes', value: 'yes' },
                { id: nanoid(), label: 'No', value: 'no' },
                { id: nanoid(), label: 'Not Applicable', value: 'not-applicable' },
            ]
        },
        {
            id: 'timelyMannerRationale',
            label: 'Please provide rationale:',
            type: 'textarea',
            conditionField: 'timelyManner',
            conditionValue: 'no',
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

// Survey V2: Two sections (Contact Information and Hospital Engagement)
// Visit-type conditional flows: Outpatient, Emergency, Inpatient
export const surveyV2 = {
  appearance: {
    themeColor: '#C8262A',
    cardShadow: 'sm',
    cardTitleSize: 'lg',
    sectionTitleSize: 'lg',
    labelSize: 'sm',
    gradient: true,
  },
  title: 'Patient Feedback Survey (V2)',
  description: 'This survey has two sections. Contact info helps us follow up if needed. Hospital engagement questions adapt to your visit type.',
  submitButtonLabel: '',
  saveProgressEnabled: true,
  shareButtonEnabled: true,
  shareTitle: 'Share this survey',
  shareText: 'I\'d like your feedback—please fill out this survey.',
  sections: [
    {
      id: 'v2-contact-information-section',
      title: 'Contact Information and Demographics',
      description: 'We collect contact details solely to follow up for clarification if needed.',
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
          ]
        },
        {
          id: 'location-group',
          type: 'group',
          fields: [
            { id: 'city', type: 'city-on', label: 'City' },
            { id: 'province', type: 'province-ca', label: 'Province' },
          ]
        },
        {
          id: 'patientOrCaregiver',
          label: 'Are you a patient or a caregiver?',
          type: 'select',
          options: [
            { id: nanoid(), label: 'Patient', value: 'patient' },
            { id: nanoid(), label: 'Caregiver', value: 'caregiver' },
            { id: nanoid(), label: 'Other', value: 'other' },
          ],
        },
        {
          id: 'patientOrCaregiverOther',
          label: 'If other, please specify',
          type: 'text',
          conditionField: 'patientOrCaregiver',
          conditionValue: 'other',
        },
        {
          id: 'visit-date-group',
          type: 'group',
          fields: [
            {
              id: 'visitMonth',
              label: 'Visit Month',
              type: 'select',
              options: months.map((m, i) => ({ id: nanoid(), label: m, value: String(i + 1).padStart(2, '0') })),
            },
            {
              id: 'visitYear',
              label: 'Visit Year',
              type: 'select',
              options: years.map((y) => ({ id: nanoid(), label: y, value: y })),
            },
          ],
        },
        {
          id: 'hospitalName',
          label: 'Which hospital did you visit?',
          type: 'hospital-on',
        },
      ],
    },
    {
      id: 'v2-hospital-engagement-section',
      title: 'Hospital Engagement',
      fields: [
        {
          id: 'visitType',
          label: 'Which type of hospital encounter did you have on your most recent visit? (Select all that apply)',
          type: 'checkbox',
          options: [
            { id: nanoid(), label: 'Outpatient clinic visit (in person or virtual)', value: 'outpatient' },
            { id: nanoid(), label: 'Emergency department (in person or virtual)', value: 'emergency' },
            { id: nanoid(), label: 'Inpatient admission', value: 'inpatient' },
          ],
        },

        // Outpatient Clinic Visit
        { id: 'outpatientReceptionRating', label: 'Reception with the first person encountered', type: 'rating', conditionField: 'visitType', conditionValue: 'outpatient' },
        { id: 'outpatientVisitReason', label: 'Reason for this visit (e.g., pain, fever, surgery, regular visit)', type: 'text', conditionField: 'visitType', conditionValue: 'outpatient' },
        {
          id: 'hcpFamiliarityOutpatient',
          label: 'How familiar were the health care providers (HCP) with your condition?',
          type: 'select',
          conditionField: 'visitType',
          conditionValue: 'outpatient',
          options: [
            { id: nanoid(), label: 'Very Familiar', value: 'very-familiar' },
            { id: nanoid(), label: 'Somewhat Familiar', value: 'somewhat-familiar' },
            { id: nanoid(), label: 'Not at all Familiar', value: 'not-at-all-familiar' },
          ],
        },
        {
          id: 'rightInvestigationsOutpatient',
          label: 'Did you feel the right investigation/tests were conducted?',
          type: 'select',
          conditionField: 'visitType',
          conditionValue: 'outpatient',
          options: [
            { id: nanoid(), label: 'Yes', value: 'yes' },
            { id: nanoid(), label: 'No', value: 'no' },
            { id: nanoid(), label: 'Not Applicable', value: 'not-applicable' },
          ],
        },
        { id: 'rightInvestigationsRationaleOutpatient', label: 'Please provide details:', type: 'textarea', conditionField: 'rightInvestigationsOutpatient', conditionValue: 'no' },
        {
          id: 'timelyMannerOutpatient',
          label: 'Did you feel you were attended to in a timely manner?',
          type: 'select',
          conditionField: 'visitType',
          conditionValue: 'outpatient',
          options: [
            { id: nanoid(), label: 'Yes', value: 'yes' },
            { id: nanoid(), label: 'No', value: 'no' },
            { id: nanoid(), label: 'Not Applicable', value: 'not-applicable' },
          ],
        },
        { id: 'timelyMannerRationaleOutpatient', label: 'Please provide rationale:', type: 'textarea', conditionField: 'timelyMannerOutpatient', conditionValue: 'no' },
        {
          id: 'optimalTimeOutpatient',
          label: 'Did you feel that you had an optimal amount of time?',
          type: 'select',
          conditionField: 'visitType',
          conditionValue: 'outpatient',
          options: [
            { id: nanoid(), label: 'Yes', value: 'yes' },
            { id: nanoid(), label: 'No', value: 'no' },
            { id: nanoid(), label: 'Not Applicable', value: 'not-applicable' },
          ],
        },
        {
          id: 'hcpRespectfulnessOutpatient',
          label: 'How respectful were the HCPs of your needs and concerns?',
          type: 'select',
          conditionField: 'visitType',
          conditionValue: 'outpatient',
          options: [
            { id: nanoid(), label: 'Very respectful', value: 'very-respectful' },
            { id: nanoid(), label: 'Somewhat respectful', value: 'somewhat-respectful' },
            { id: nanoid(), label: 'Neutral', value: 'neutral' },
            { id: nanoid(), label: 'Not respectful', value: 'not-respectful' },
            { id: nanoid(), label: 'Other', value: 'other' },
          ],
        },
        { id: 'hcpRespectfulnessOtherOutpatient', label: 'Please provide additional details:', type: 'textarea', conditionField: 'hcpRespectfulnessOutpatient', conditionValue: 'other' },
        {
          id: 'concernsAddressedOutpatient',
          label: 'Did you feel your concerns were well addressed?',
          type: 'select',
          conditionField: 'visitType',
          conditionValue: 'outpatient',
          options: [
            { id: nanoid(), label: 'Yes', value: 'yes' },
            { id: nanoid(), label: 'No', value: 'no' },
            { id: nanoid(), label: 'Not Applicable', value: 'not-applicable' },
          ],
        },
        {
          id: 'reportedToHospitalOutpatient',
          label: 'Did you report this situation to the hospital?',
          type: 'select',
          conditionField: 'concernsAddressedOutpatient',
          conditionValue: 'no',
          options: [
            { id: nanoid(), label: 'Yes', value: 'yes' },
            { id: nanoid(), label: 'No', value: 'no' },
          ],
        },
        { id: 'reportOutcomeOutpatient', label: 'If “Yes”, what was the outcome of your report?', type: 'textarea', conditionField: 'reportedToHospitalOutpatient', conditionValue: 'yes' },
        {
          id: 'reportNotDoneReasonOutpatient',
          label: 'If “No”, why not?',
          type: 'select',
          conditionField: 'reportedToHospitalOutpatient',
          conditionValue: 'no',
          options: [
            { id: nanoid(), label: 'Not aware of complaint process', value: 'not-aware' },
            { id: nanoid(), label: 'Not comfortable', value: 'not-comfortable' },
            { id: nanoid(), label: 'Other', value: 'other' },
          ],
        },
        { id: 'reportNotDoneReasonOtherOutpatient', label: 'If other, please specify:', type: 'text', conditionField: 'reportNotDoneReasonOutpatient', conditionValue: 'other' },
        { id: 'anythingElseOutpatient', label: 'Is there anything else you would like us to know about this hospital interaction?', type: 'textarea', conditionField: 'visitType', conditionValue: 'outpatient' },

        // Emergency Department Visit
        { id: 'edReceptionRating', label: 'Reception with the first person encountered (e.g., Triage Nurse)', type: 'rating', conditionField: 'visitType', conditionValue: 'emergency' },
        { id: 'triageNurseName', label: 'Name of Triage Nurse', type: 'text', conditionField: 'visitType', conditionValue: 'emergency' },
        {
          id: 'wasPainCrisisED',
          label: 'Was this visit for a pain crisis?',
          type: 'radio',
          conditionField: 'visitType',
          conditionValue: 'emergency',
          options: [
            { id: nanoid(), label: 'Yes', value: 'yes' },
            { id: nanoid(), label: 'No', value: 'no' },
          ],
        },
        { id: 'timeToAnalgesiaED', label: 'If pain crisis, how long before the first analgesia was administered?', type: 'duration-hm', conditionField: 'wasPainCrisisED', conditionValue: 'yes' },
        { id: 'visitReasonED', label: 'Reason for this visit? (e.g., fever, surgery, if other please specify)', type: 'text', conditionField: 'wasPainCrisisED', conditionValue: 'no' },
        {
          id: 'hcpRespectfulnessED',
          label: 'How respectful were the HCPs of your needs and concerns?',
          type: 'select',
          conditionField: 'visitType',
          conditionValue: 'emergency',
          options: [
            { id: nanoid(), label: 'Very respectful', value: 'very-respectful' },
            { id: nanoid(), label: 'Somewhat respectful', value: 'somewhat-respectful' },
            { id: nanoid(), label: 'Neutral', value: 'neutral' },
            { id: nanoid(), label: 'Not respectful', value: 'not-respectful' },
            { id: nanoid(), label: 'Other', value: 'other' },
          ],
        },
        { id: 'hcpRespectfulnessOtherED', label: 'Please provide additional details:', type: 'textarea', conditionField: 'hcpRespectfulnessED', conditionValue: 'other' },
        {
          id: 'experiencedED',
          label: 'Did you experience any of the following as a result of seeking treatment during this interaction? (Select all that apply)',
          type: 'checkbox',
          conditionField: 'visitType',
          conditionValue: 'emergency',
          options: [
            { id: nanoid(), label: 'Stigmatization or stereotyping', value: 'stigmatization-stereotyping' },
            { id: nanoid(), label: 'Anxiety', value: 'anxiety' },
            { id: nanoid(), label: 'Helplessness or Isolation', value: 'helplessness-isolation' },
            { id: nanoid(), label: 'Disrespect', value: 'disrespect' },
            { id: nanoid(), label: 'Bullying', value: 'bullying' },
            { id: nanoid(), label: 'Attentiveness', value: 'attentiveness' },
            { id: nanoid(), label: 'Compassion/empathy', value: 'compassion-empathy' },
            { id: nanoid(), label: 'Understanding', value: 'understanding' },
            { id: nanoid(), label: 'Other', value: 'other' },
          ],
        },
        { id: 'experiencedOtherED', label: 'Please elaborate:', type: 'textarea', conditionField: 'experiencedED', conditionValue: 'other' },
        { id: 'clinicianNamesOptimalED', label: 'Name of Physician, Nurse and other clinicians who provided optimal care', type: 'textarea', conditionField: 'visitType', conditionValue: 'emergency' },
        { id: 'clinicianNamesSuboptimalED', label: 'Name of Physician, Nurse and other clinicians who provided sub-optimal care', type: 'textarea', conditionField: 'visitType', conditionValue: 'emergency' },
        {
          id: 'rightInvestigationsED',
          label: 'Did you feel the right investigation/tests were conducted?',
          type: 'select',
          conditionField: 'visitType',
          conditionValue: 'emergency',
          options: [
            { id: nanoid(), label: 'Yes', value: 'yes' },
            { id: nanoid(), label: 'No', value: 'no' },
            { id: nanoid(), label: 'Not Applicable', value: 'not-applicable' },
          ],
        },
        { id: 'rightInvestigationsRationaleED', label: 'Please provide details:', type: 'textarea', conditionField: 'rightInvestigationsED', conditionValue: 'no' },
        {
          id: 'timelyMannerED',
          label: 'Did you feel you were attended to in a timely manner?',
          type: 'select',
          conditionField: 'visitType',
          conditionValue: 'emergency',
          options: [
            { id: nanoid(), label: 'Yes', value: 'yes' },
            { id: nanoid(), label: 'No', value: 'no' },
            { id: nanoid(), label: 'Not Applicable', value: 'not-applicable' },
          ],
        },
        { id: 'timelyMannerRationaleED', label: 'Please provide rationale:', type: 'textarea', conditionField: 'timelyMannerED', conditionValue: 'no' },
        { id: 'edStayLength', label: 'How long was your emergency department stay?', type: 'time-amount', conditionField: 'visitType', conditionValue: 'emergency' },
        {
          id: 'hcpFamiliarityED',
          label: 'How familiar were the health care providers (HCP) with your condition?',
          type: 'select',
          conditionField: 'visitType',
          conditionValue: 'emergency',
          options: [
            { id: nanoid(), label: 'Very Familiar', value: 'very-familiar' },
            { id: nanoid(), label: 'Somewhat Familiar', value: 'somewhat-familiar' },
            { id: nanoid(), label: 'Not at all Familiar', value: 'not-at-all-familiar' },
          ],
        },
        {
          id: 'optimalTimeED',
          label: 'Did you feel that you had an optimal amount of time?',
          type: 'select',
          conditionField: 'visitType',
          conditionValue: 'emergency',
          options: [
            { id: nanoid(), label: 'Yes', value: 'yes' },
            { id: nanoid(), label: 'No', value: 'no' },
            { id: nanoid(), label: 'Not Applicable', value: 'not-applicable' },
          ],
        },
        {
          id: 'concernsAddressedED',
          label: 'Did you feel your concerns were well addressed?',
          type: 'select',
          conditionField: 'visitType',
          conditionValue: 'emergency',
          options: [
            { id: nanoid(), label: 'Yes', value: 'yes' },
            { id: nanoid(), label: 'No', value: 'no' },
            { id: nanoid(), label: 'Not Applicable', value: 'not-applicable' },
          ],
        },
        { id: 'reportedToHospitalED', label: 'Did you report this situation to the hospital?', type: 'select', conditionField: 'concernsAddressedED', conditionValue: 'no', options: [ { id: nanoid(), label: 'Yes', value: 'yes' }, { id: nanoid(), label: 'No', value: 'no' } ] },
        { id: 'reportOutcomeED', label: 'If “Yes”, what was the outcome of your report?', type: 'textarea', conditionField: 'reportedToHospitalED', conditionValue: 'yes' },
        { id: 'reportNotDoneReasonED', label: 'If “No”, why not?', type: 'select', conditionField: 'reportedToHospitalED', conditionValue: 'no', options: [ { id: nanoid(), label: 'Not aware of complaint process', value: 'not-aware' }, { id: nanoid(), label: 'Not comfortable', value: 'not-comfortable' }, { id: nanoid(), label: 'Other', value: 'other' } ] },
        { id: 'reportNotDoneReasonOtherED', label: 'If other, please specify:', type: 'text', conditionField: 'reportNotDoneReasonED', conditionValue: 'other' },
        { id: 'followUpPlanED', label: 'Before being discharged, were you provided with any follow-up plan?', type: 'radio', conditionField: 'visitType', conditionValue: 'emergency', options: [ { id: nanoid(), label: 'Yes', value: 'yes' }, { id: nanoid(), label: 'No', value: 'no' } ] },
        { id: 'scagoFollowUpED', label: 'Were you advised to follow up with SCAGO after being discharged?', type: 'radio', conditionField: 'followUpPlanED', conditionValue: 'yes', options: [ { id: nanoid(), label: 'Yes', value: 'yes' }, { id: nanoid(), label: 'No', value: 'no' } ] },
        { id: 'anythingElseED', label: 'Is there anything else you would like us to know about this hospital interaction?', type: 'textarea', conditionField: 'visitType', conditionValue: 'emergency' },

        // Inpatient Admission
        { id: 'inpatientUnitDepartment', label: 'Unit/department', type: 'text', conditionField: 'visitType', conditionValue: 'inpatient' },
        { id: 'inPainCrisisInpatient', label: 'Were you in the hospital for pain crisis?', type: 'radio', conditionField: 'visitType', conditionValue: 'inpatient', options: [ { id: nanoid(), label: 'Yes', value: 'yes' }, { id: nanoid(), label: 'No', value: 'no' } ] },
        { id: 'timelyMedicationsInpatient', label: 'Did you receive timely medications while in the hospital?', type: 'radio', conditionField: 'visitType', conditionValue: 'inpatient', options: [ { id: nanoid(), label: 'Yes', value: 'yes' }, { id: nanoid(), label: 'No', value: 'no' } ] },
        {
          id: 'rightInvestigationsInpatient',
          label: 'Did you feel the right investigation/tests were conducted?',
          type: 'select',
          conditionField: 'visitType',
          conditionValue: 'inpatient',
          options: [
            { id: nanoid(), label: 'Yes', value: 'yes' },
            { id: nanoid(), label: 'No', value: 'no' },
            { id: nanoid(), label: 'Not Applicable', value: 'not-applicable' },
          ],
        },
        { id: 'rightInvestigationsRationaleInpatient', label: 'Please provide details:', type: 'textarea', conditionField: 'rightInvestigationsInpatient', conditionValue: 'no' },
        {
          id: 'timelyMannerInpatient',
          label: 'Did you feel you were attended to in a timely manner?',
          type: 'select',
          conditionField: 'visitType',
          conditionValue: 'inpatient',
          options: [
            { id: nanoid(), label: 'Yes', value: 'yes' },
            { id: nanoid(), label: 'No', value: 'no' },
            { id: nanoid(), label: 'Not Applicable', value: 'not-applicable' },
          ],
        },
        { id: 'timelyMannerRationaleInpatient', label: 'Please provide rationale:', type: 'textarea', conditionField: 'timelyMannerInpatient', conditionValue: 'no' },
        { id: 'hospitalStayLengthInpatient', label: 'How long was your hospital stay?', type: 'time-amount', conditionField: 'visitType', conditionValue: 'inpatient' },
        { id: 'clinicianNamesOptimalInpatient', label: 'Name of Physician, Nurse and other clinicians who provided optimal care', type: 'textarea', conditionField: 'visitType', conditionValue: 'inpatient' },
        { id: 'clinicianNamesSuboptimalInpatient', label: 'Name of Physician, Nurse and other clinicians who provided sub-optimal care', type: 'textarea', conditionField: 'visitType', conditionValue: 'inpatient' },
        {
          id: 'hcpFamiliarityInpatient',
          label: 'How familiar were the health care providers (HCP) with your condition?',
          type: 'select',
          conditionField: 'visitType',
          conditionValue: 'inpatient',
          options: [
            { id: nanoid(), label: 'Very Familiar', value: 'very-familiar' },
            { id: nanoid(), label: 'Somewhat Familiar', value: 'somewhat-familiar' },
            { id: nanoid(), label: 'Not at all Familiar', value: 'not-at-all-familiar' },
          ],
        },
        {
          id: 'hcpRespectfulnessInpatient',
          label: 'How respectful were the HCPs of your needs and concerns?',
          type: 'select',
          conditionField: 'visitType',
          conditionValue: 'inpatient',
          options: [
            { id: nanoid(), label: 'Very respectful', value: 'very-respectful' },
            { id: nanoid(), label: 'Somewhat respectful', value: 'somewhat-respectful' },
            { id: nanoid(), label: 'Neutral', value: 'neutral' },
            { id: nanoid(), label: 'Not respectful', value: 'not-respectful' },
            { id: nanoid(), label: 'Other', value: 'other' },
          ],
        },
        { id: 'hcpRespectfulnessOtherInpatient', label: 'Please provide additional details:', type: 'textarea', conditionField: 'hcpRespectfulnessInpatient', conditionValue: 'other' },
        {
          id: 'experiencedInpatient',
          label: 'Did you experience any of the following as a result of seeking treatment during this interaction? (Select all that apply)',
          type: 'checkbox',
          conditionField: 'visitType',
          conditionValue: 'inpatient',
          options: [
            { id: nanoid(), label: 'Stigmatization or stereotyping', value: 'stigmatization-stereotyping' },
            { id: nanoid(), label: 'Anxiety', value: 'anxiety' },
            { id: nanoid(), label: 'Helplessness or Isolation', value: 'helplessness-isolation' },
            { id: nanoid(), label: 'Disrespect', value: 'disrespect' },
            { id: nanoid(), label: 'Bullying', value: 'bullying' },
            { id: nanoid(), label: 'Attentiveness', value: 'attentiveness' },
            { id: nanoid(), label: 'Compassion/empathy', value: 'compassion-empathy' },
            { id: nanoid(), label: 'Understanding', value: 'understanding' },
            { id: nanoid(), label: 'Other', value: 'other' },
          ],
        },
        { id: 'experiencedOtherInpatient', label: 'Please elaborate:', type: 'textarea', conditionField: 'experiencedInpatient', conditionValue: 'other' },
        {
          id: 'optimalTimeInpatient',
          label: 'Did you feel that you had an optimal amount of time?',
          type: 'select',
          conditionField: 'visitType',
          conditionValue: 'inpatient',
          options: [
            { id: nanoid(), label: 'Yes', value: 'yes' },
            { id: nanoid(), label: 'No', value: 'no' },
            { id: nanoid(), label: 'Not Applicable', value: 'not-applicable' },
          ],
        },
        {
          id: 'concernsAddressedInpatient',
          label: 'Did you feel your concerns were well addressed?',
          type: 'select',
          conditionField: 'visitType',
          conditionValue: 'inpatient',
          options: [
            { id: nanoid(), label: 'Yes', value: 'yes' },
            { id: nanoid(), label: 'No', value: 'no' },
            { id: nanoid(), label: 'Not Applicable', value: 'not-applicable' },
          ],
        },
        { id: 'reportedToHospitalInpatient', label: 'Did you report this situation to the hospital?', type: 'select', conditionField: 'concernsAddressedInpatient', conditionValue: 'no', options: [ { id: nanoid(), label: 'Yes', value: 'yes' }, { id: nanoid(), label: 'No', value: 'no' } ] },
        { id: 'reportOutcomeInpatient', label: 'If “Yes”, what was the outcome of your report?', type: 'textarea', conditionField: 'reportedToHospitalInpatient', conditionValue: 'yes' },
        { id: 'reportNotDoneReasonInpatient', label: 'If “No”, why not?', type: 'select', conditionField: 'reportedToHospitalInpatient', conditionValue: 'no', options: [ { id: nanoid(), label: 'Not aware of complaint process', value: 'not-aware' }, { id: nanoid(), label: 'Not comfortable', value: 'not-comfortable' }, { id: nanoid(), label: 'Other', value: 'other' } ] },
        { id: 'reportNotDoneReasonOtherInpatient', label: 'If other, please specify:', type: 'text', conditionField: 'reportNotDoneReasonInpatient', conditionValue: 'other' },
        { id: 'followUpPlanInpatient', label: 'Before being discharged, were you provided with any follow-up plan?', type: 'radio', conditionField: 'visitType', conditionValue: 'inpatient', options: [ { id: nanoid(), label: 'Yes', value: 'yes' }, { id: nanoid(), label: 'No', value: 'no' } ] },
        { id: 'scagoFollowUpInpatient', label: 'Were you advised to follow up with SCAGO after being discharged?', type: 'radio', conditionField: 'followUpPlanInpatient', conditionValue: 'yes', options: [ { id: nanoid(), label: 'Yes', value: 'yes' }, { id: nanoid(), label: 'No', value: 'no' } ] },
        { id: 'anythingElseInpatient', label: 'Is there anything else you would like us to know about this hospital interaction?', type: 'textarea', conditionField: 'visitType', conditionValue: 'inpatient' },

        // Additional Feedback (not type-specific)
        { id: 'additionalFeedback', label: 'Anything else you might want to add in your own words?', type: 'textarea' },
      ],
    },
  ],
};

// SCAGO Digital Consent & Information Collection Survey
export const consentSurvey = {
  appearance: {
    themeColor: '#C8262A',
    cardShadow: 'sm',
    cardTitleSize: 'lg',
    sectionTitleSize: 'lg',
    labelSize: 'sm',
    gradient: true,
    showTitle: true,
  },
  title: 'SCAGO Digital Consent & Information Collection',
  description: 'The Sickle Cell Awareness Group of Ontario (SCAGO) is Ontario\'s largest patient support and advocacy organization. By completing this form, you are providing your information to SCAGO. We store all data securely and will never share your personal information with third parties without your consent.',
  submitButtonLabel: 'Submit Consent Form',
  saveProgressEnabled: true,
  shareButtonEnabled: false,
  sections: [
    {
      id: 'consent-notice-section',
      title: 'About SCAGO & Consent to Participate',
      description: 'SCAGO has been creating and delivering evidence-based supports and services across Ontario since 2005. SCAGO offers non-medical support services only. If you require urgent medical attention, please contact your healthcare provider or call 911. Note: This form is for individuals aged 18 or older. If you are under 18, a parent or guardian must complete this form on your behalf.',
      fields: [
        {
          id: 'ageConfirmation',
          label: 'I confirm that I am 18 years of age or older, OR I am a parent/guardian completing this form on behalf of someone under 18',
          type: 'boolean-checkbox',
          validation: { required: true },
        },
      ],
    },
    {
      id: 'basic-information-section',
      title: 'Basic Information',
      fields: [
        {
          id: 'title',
          label: 'Title',
          type: 'radio',
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
          label: 'If other, please specify',
          type: 'text',
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
          label: 'Street Address',
          type: 'text',
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
          label: 'Postal Code',
          type: 'text',
          validation: { required: true },
        },
      ],
    },
    {
      id: 'scd-connection-section',
      title: 'Your Connection to Sickle Cell Disease',
      fields: [
        {
          id: 'scdConnection',
          label: 'Please select all that apply',
          type: 'checkbox',
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
          label: 'If you selected "Other" above, please describe',
          type: 'text',
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
    {
      id: 'care-information-section',
      title: 'Care Information',
      fields: [
        {
          id: 'primaryHospital',
          label: 'Which hospital(s) do you/your child primarily receive care from for SCD?',
          type: 'hospital-on',
          validation: { required: true },
        },
      ],
    },
    {
      id: 'stay-connected-section',
      title: 'Stay Connected',
      fields: [
        {
          id: 'mayContact',
          label: 'May we contact you about SCAGO services, programs, or events?',
          type: 'radio',
          validation: { required: true },
          options: [
            { id: nanoid(), label: 'Yes', value: 'yes' },
            { id: nanoid(), label: 'No', value: 'no' },
          ],
        },
        {
          id: 'preferredContactMethod',
          label: 'Preferred method of contact',
          type: 'radio',
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
          label: 'Would you like to join SCAGO\'s mailing list for updates, newsletters, and advocacy news?',
          type: 'radio',
          validation: { required: true },
          options: [
            { id: nanoid(), label: 'Yes', value: 'yes' },
            { id: nanoid(), label: 'No', value: 'no' },
          ],
        },
        {
          id: 'joinSupportGroups',
          label: 'Would you like to join our WhatsApp or face-to-face support groups?',
          type: 'radio',
          validation: { required: true },
          options: [
            { id: nanoid(), label: 'Yes', value: 'yes' },
            { id: nanoid(), label: 'No', value: 'no' },
          ],
        },
        {
          id: 'supportGroupContactMethod',
          label: 'How should we contact you about support groups?',
          type: 'radio',
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
          label: 'Do you consent to a SCAGO staff member or Patient Well-Being Coordinator advocating on your behalf when requested?',
          type: 'radio',
          validation: { required: true },
          options: [
            { id: nanoid(), label: 'Yes', value: 'yes' },
            { id: nanoid(), label: 'No', value: 'no' },
          ],
        },
      ],
    },
    {
      id: 'consent-confirmation-section',
      title: 'Consent and Confirmation',
      description: 'By typing your name below, you confirm that: (1) You are 18 years or older, (2) You have read and understood the information provided above, (3) You voluntarily consent to SCAGO\'s collection and use of your information as described.',
      fields: [
        {
          id: 'digitalSignature',
          label: 'Full Name (Digital Signature)',
          type: 'digital-signature',
          validation: { required: true },
        },
        {
          id: 'signatureDate',
          label: 'Date',
          type: 'date',
          validation: { required: true },
        },
      ],
    },
  ],
};

// SCAGO Digital Consent & Information Collection Survey - French Version
export const consentSurveyFr = {
  appearance: {
    themeColor: '#C8262A',
    cardShadow: 'sm',
    cardTitleSize: 'lg',
    sectionTitleSize: 'lg',
    labelSize: 'sm',
    gradient: true,
    showTitle: true,
  },
  title: 'Consentement Numérique et Collecte d\'Informations SCAGO',
  description: 'Le Groupe de Sensibilisation à la Drépanocytose de l\'Ontario (SCAGO) est la plus grande organisation de soutien et de défense des patients en Ontario. En complétant ce formulaire, vous fournissez vos informations à SCAGO. Nous stockons toutes les données de manière sécurisée et ne partagerons jamais vos informations personnelles avec des tiers sans votre consentement.',
  submitButtonLabel: 'Soumettre le Formulaire de Consentement',
  saveProgressEnabled: true,
  shareButtonEnabled: false,
  sections: [
    {
      id: 'consent-notice-section-fr',
      title: 'À propos de SCAGO et Consentement à Participer',
      description: 'SCAGO crée et fournit des services et du soutien basés sur des preuves à travers l\'Ontario depuis 2005. SCAGO offre uniquement des services de soutien non médicaux. Si vous avez besoin d\'une attention médicale urgente, veuillez contacter votre fournisseur de soins de santé ou appeler le 911. Note: Ce formulaire est destiné aux personnes de 18 ans ou plus. Si vous avez moins de 18 ans, un parent ou tuteur doit compléter ce formulaire en votre nom.',
      fields: [
        {
          id: 'ageConfirmation',
          label: 'Je confirme que j\'ai 18 ans ou plus, OU je suis un parent/tuteur complétant ce formulaire au nom de quelqu\'un de moins de 18 ans',
          type: 'boolean-checkbox',
          validation: { required: true },
        },
      ],
    },
    {
      id: 'basic-information-section-fr',
      title: 'Informations de Base',
      fields: [
        {
          id: 'title',
          label: 'Titre',
          type: 'radio',
          validation: { required: true },
          options: [
            { id: nanoid(), label: 'M.', value: 'mr' },
            { id: nanoid(), label: 'Mme', value: 'mrs' },
            { id: nanoid(), label: 'Mlle', value: 'ms' },
            { id: nanoid(), label: 'Mx', value: 'mx' },
            { id: nanoid(), label: 'Dr', value: 'dr' },
            { id: nanoid(), label: 'Autre', value: 'other' },
          ],
        },
        {
          id: 'titleOther',
          label: 'Si autre, veuillez préciser',
          type: 'text',
          conditionField: 'title',
          conditionValue: 'other',
          validation: { required: true },
        },
        {
          id: 'consent-name-group',
          type: 'group',
          fields: [
            { id: 'firstName', type: 'text', label: 'Prénom', validation: { required: true } },
            { id: 'lastName', type: 'text', label: 'Nom de famille', validation: { required: true } },
          ],
        },
        {
          id: 'consent-contact-group',
          type: 'group',
          fields: [
            { id: 'email', type: 'email', label: 'Adresse courriel', validation: { required: true } },
            { id: 'phone', type: 'phone', label: 'Numéro de téléphone (cellulaire)', validation: { required: true } },
          ],
        },
        {
          id: 'streetAddress',
          label: 'Adresse',
          type: 'text',
          validation: { required: true },
        },
        {
          id: 'consent-location-group',
          type: 'group',
          fields: [
            { id: 'city', type: 'city-on', label: 'Ville', validation: { required: true } },
            { id: 'province', type: 'province-ca', label: 'Province', validation: { required: true } },
          ],
        },
        {
          id: 'postalCode',
          label: 'Code postal',
          type: 'text',
          validation: { required: true },
        },
      ],
    },
    {
      id: 'scd-connection-section-fr',
      title: 'Votre Lien avec la Drépanocytose',
      fields: [
        {
          id: 'scdConnection',
          label: 'Veuillez sélectionner tout ce qui s\'applique',
          type: 'checkbox',
          validation: { required: true },
          options: [
            { id: nanoid(), label: 'J\'ai la drépanocytose', value: 'i-have-scd' },
            { id: nanoid(), label: 'Mon enfant a la drépanocytose', value: 'my-child-has-scd' },
            { id: nanoid(), label: 'Je suis un aidant ou un membre de la famille', value: 'caregiver-family' },
            { id: nanoid(), label: 'Je suis un professionnel de la santé', value: 'healthcare-provider' },
            { id: nanoid(), label: 'Autre', value: 'other' },
          ],
        },
        {
          id: 'scdConnectionOther',
          label: 'Si vous avez sélectionné "Autre" ci-dessus, veuillez décrire',
          type: 'text',
        },
        {
          id: 'individual1-group',
          type: 'group',
          fields: [
            { id: 'individual1Name', type: 'text', label: 'Personne 1 - Nom' },
            { id: 'individual1DOB', type: 'date', label: 'Personne 1 - Date de Naissance' },
          ],
        },
        {
          id: 'individual2-group',
          type: 'group',
          fields: [
            { id: 'individual2Name', type: 'text', label: 'Personne 2 - Nom' },
            { id: 'individual2DOB', type: 'date', label: 'Personne 2 - Date de Naissance' },
          ],
        },
        {
          id: 'individual3-group',
          type: 'group',
          fields: [
            { id: 'individual3Name', type: 'text', label: 'Personne 3 - Nom' },
            { id: 'individual3DOB', type: 'date', label: 'Personne 3 - Date de Naissance' },
          ],
        },
      ],
    },
    {
      id: 'care-information-section-fr',
      title: 'Informations de Soins',
      fields: [
        {
          id: 'primaryHospital',
          label: 'Dans quel(s) hôpital(s) recevez-vous/votre enfant recevez-vous principalement des soins pour la drépanocytose?',
          type: 'hospital-on',
          validation: { required: true },
        },
      ],
    },
    {
      id: 'stay-connected-section-fr',
      title: 'Restez Connecté',
      fields: [
        {
          id: 'mayContact',
          label: 'Pouvons-nous vous contacter au sujet des services, programmes ou événements de SCAGO?',
          type: 'radio',
          validation: { required: true },
          options: [
            { id: nanoid(), label: 'Oui', value: 'yes' },
            { id: nanoid(), label: 'Non', value: 'no' },
          ],
        },
        {
          id: 'preferredContactMethod',
          label: 'Méthode de contact préférée',
          type: 'radio',
          conditionField: 'mayContact',
          conditionValue: 'yes',
          validation: { required: true },
          options: [
            { id: nanoid(), label: 'Courriel', value: 'email' },
            { id: nanoid(), label: 'Téléphone (SMS/Appel)', value: 'phone' },
            { id: nanoid(), label: 'L\'un ou l\'autre', value: 'either' },
          ],
        },
        {
          id: 'joinMailingList',
          label: 'Aimeriez-vous vous inscrire à la liste de diffusion de SCAGO pour les mises à jour, bulletins et nouvelles de plaidoyer?',
          type: 'radio',
          validation: { required: true },
          options: [
            { id: nanoid(), label: 'Oui', value: 'yes' },
            { id: nanoid(), label: 'Non', value: 'no' },
          ],
        },
        {
          id: 'joinSupportGroups',
          label: 'Aimeriez-vous rejoindre nos groupes de soutien WhatsApp ou en personne?',
          type: 'radio',
          validation: { required: true },
          options: [
            { id: nanoid(), label: 'Oui', value: 'yes' },
            { id: nanoid(), label: 'Non', value: 'no' },
          ],
        },
        {
          id: 'supportGroupContactMethod',
          label: 'Comment devrions-nous vous contacter au sujet des groupes de soutien?',
          type: 'radio',
          conditionField: 'joinSupportGroups',
          conditionValue: 'yes',
          validation: { required: true },
          options: [
            { id: nanoid(), label: 'Courriel', value: 'email' },
            { id: nanoid(), label: 'Téléphone', value: 'phone' },
            { id: nanoid(), label: 'L\'un ou l\'autre', value: 'either' },
          ],
        },
        {
          id: 'consentToAdvocacy',
          label: 'Consentez-vous à ce qu\'un membre du personnel de SCAGO ou un coordinateur du bien-être des patients plaide en votre nom lorsque demandé?',
          type: 'radio',
          validation: { required: true },
          options: [
            { id: nanoid(), label: 'Oui', value: 'yes' },
            { id: nanoid(), label: 'Non', value: 'no' },
          ],
        },
      ],
    },
    {
      id: 'consent-confirmation-section-fr',
      title: 'Consentement et Confirmation',
      description: 'En tapant votre nom ci-dessous, vous confirmez que: (1) Vous avez 18 ans ou plus, (2) Vous avez lu et compris les informations fournies ci-dessus, (3) Vous consentez volontairement à la collecte et à l\'utilisation de vos informations par SCAGO comme décrit.',
      fields: [
        {
          id: 'digitalSignature',
          label: 'Nom Complet (Signature Numérique)',
          type: 'digital-signature',
          validation: { required: true },
        },
        {
          id: 'signatureDate',
          label: 'Date',
          type: 'date',
          validation: { required: true },
        },
      ],
    },
  ],
};