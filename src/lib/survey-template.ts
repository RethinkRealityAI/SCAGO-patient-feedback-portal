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
  submitButtonLabel: 'Submit',
  saveProgressEnabled: true,
  shareButtonEnabled: true,
  shareTitle: 'Share this survey',
  shareText: 'I’d like your feedback—please fill out this survey.',
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
          label: 'Which type of hospital encounter did you have on your most recent visit?',
          type: 'radio',
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
        { id: 'hcpRespectfulnessOutpatient', label: 'How respectful were the HCPs of your needs and concerns?', type: 'textarea', conditionField: 'visitType', conditionValue: 'outpatient' },
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
        { id: 'visitReasonED', label: 'Reason for this visit? (e.g., pain crisis, fever, surgery, other)', type: 'text', conditionField: 'visitType', conditionValue: 'emergency' },
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
        { id: 'hcpRespectfulnessED', label: 'How respectful were the HCPs of your needs and concerns?', type: 'textarea', conditionField: 'visitType', conditionValue: 'emergency' },
        {
          id: 'experiencedED',
          label: 'Did you experience any of the following as a result of seeking treatment during this interaction?',
          type: 'radio',
          conditionField: 'visitType',
          conditionValue: 'emergency',
          options: [
            { id: nanoid(), label: 'Stigmatization or stereotyping', value: 'stigmatization-stereotyping' },
            { id: nanoid(), label: 'Anxiety', value: 'anxiety' },
            { id: nanoid(), label: 'Helplessness or Isolation', value: 'helplessness-isolation' },
            { id: nanoid(), label: 'Other', value: 'other' },
          ],
        },
        { id: 'experiencedOtherED', label: 'If other, please specify:', type: 'text', conditionField: 'experiencedED', conditionValue: 'other' },
        { id: 'clinicianNamesED', label: 'Name of Physician, Nurse and other clinicians providing optimal or sub-optimal care', type: 'textarea', conditionField: 'visitType', conditionValue: 'emergency' },
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
        { id: 'hospitalStayLengthInpatient', label: 'How long was your hospital stay?', type: 'time-amount', conditionField: 'visitType', conditionValue: 'inpatient' },
        { id: 'clinicianNamesInpatient', label: 'Name of Physician, Nurse and other clinicians providing optimal or sub-optimal care', type: 'textarea', conditionField: 'visitType', conditionValue: 'inpatient' },
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
        { id: 'hcpRespectfulnessInpatient', label: 'How respectful were the HCPs of your needs and concerns?', type: 'textarea', conditionField: 'visitType', conditionValue: 'inpatient' },
        {
          id: 'experiencedInpatient',
          label: 'Did you experience any of the following as a result of seeking treatment during this interaction?',
          type: 'radio',
          conditionField: 'visitType',
          conditionValue: 'inpatient',
          options: [
            { id: nanoid(), label: 'Stigmatization or stereotyping', value: 'stigmatization-stereotyping' },
            { id: nanoid(), label: 'Anxiety', value: 'anxiety' },
            { id: nanoid(), label: 'Helplessness or Isolation', value: 'helplessness-isolation' },
            { id: nanoid(), label: 'Other', value: 'other' },
          ],
        },
        { id: 'experiencedOtherInpatient', label: 'If other, please specify:', type: 'text', conditionField: 'experiencedInpatient', conditionValue: 'other' },
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
        { id: 'anythingElseInpatient', label: 'Is there anything else you would like us to know about this hospital interaction?', type: 'textarea', conditionField: 'visitType', conditionValue: 'inpatient' },

        // Additional Feedback (not type-specific)
        { id: 'additionalFeedback', label: 'Anything else you might want to add in your own words?', type: 'textarea' },
      ],
    },
  ],
};