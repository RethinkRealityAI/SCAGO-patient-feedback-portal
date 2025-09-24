import { nanoid } from 'nanoid';

// NOTE: The 'id' of each field must match the camelCase property name
// in the FeedbackSubmission interface (src/app/dashboard/types.ts)

export const defaultSurvey = {
  title: 'Patient Feedback Survey',
  description: 'The following information will help us understand the scope of the situation. Kindly provide as much information as you can.',
  sections: [
    {
      id: 'quality-of-care-section',
      title: 'Section 1: Perception Around Quality of Care',
      description: 'Please provide as much information as you can.',
      fields: [
        {
          id: 'patientOrCaregiver',
          label: 'Are you a patient or a caregiver?',
          type: 'radio',
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
          id: 'admittedToWard',
          label: 'Were you admitted to inpatient ward?',
          type: 'radio',
          options: [
            { id: nanoid(), label: 'Yes', value: 'yes' },
            { id: nanoid(), label: 'No', value: 'no' },
          ],
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
          id: 'hospitalStayLength',
          label: 'How long was your hospital stay? (e.g., 5 hours, 2 days):',
          type: 'text',
        },
        {
          id: 'hcpFamiliarity',
          label: 'How familiar were the health care providers (HCP) with your condition?',
          type: 'select',
          options: [
            { id: nanoid(), label: 'Very Familiar', value: 'very-familiar' },
            { id: nanoid(), label: 'Somewhat Familiar', value: 'somewhat-familiar' },
            { id: nanoid(), label: 'Not Familiar', value: 'not-familiar' },
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
          type: 'checkbox',
          options: [
            { id: nanoid(), label: 'Stigmatization or stereotyping', value: 'stigmatization-stereotyping' },
            { id: nanoid(), label: 'Anxiety', value: 'anxiety' },
            { id: nanoid(), label: 'Helplessness or Isolation', value: 'helplessness-isolation' },
            { id: nanoid(), label: 'Other', value: 'other' },
          ],
        },
      ],
    },
    {
      id: 'action-follow-up-section',
      title: 'Section 2: Action and Follow-up',
      description: 'This section helps us understand what actions were taken after your interaction.',
      fields: [
        {
          id: 'investigationConducted',
          label: 'If an investigation was conducted, what were the results?',
          type: 'textarea',
        },
        {
          id: 'concernsAddressed',
          label: 'Were your concerns adequately addressed?',
          type: 'radio',
          options: [
            { id: nanoid(), label: 'Yes', value: 'yes' },
            { id: nanoid(), label: 'No', value: 'no' },
          ],
        },
        {
          id: 'reportedToHospital',
          label: 'Was this reported to the hospital Patient Relations/Ombudsman?',
          type: 'radio',
          options: [
            { id: nanoid(), label: 'Yes', value: 'yes' },
            { id: nanoid(), label: 'No', value: 'no' },
          ],
        },
        {
          id: 'reportOutcome',
          label: 'If yes, what was the outcome?',
          type: 'textarea',
          conditionField: 'reportedToHospital',
          conditionValue: 'yes',
        },
        {
          id: 'reportNotDoneReason',
          label: 'If no, please select the reason why.',
          type: 'radio',
          options: [
            { id: nanoid(), label: 'Did not know how to report', value: 'did-not-know' },
            { id: nanoid(), label: 'I was afraid of repercussions', value: 'afraid' },
            { id: nanoid(), label: 'Previous reports were not addressed', value: 'not-addressed' },
            { id: nanoid(), label: 'Other', value: 'other' },
          ],
          conditionField: 'reportedToHospital',
          conditionValue: 'no',
        },
        {
          id: 'interaction-date-group',
          type: 'group',
          label: 'Please specify month and year of interaction.',
          fields: [
            {
              id: 'interactionMonth',
              label: 'Month',
              type: 'text',
              placeholder: 'e.g., January',
            },
            {
              id: 'interactionYear',
              label: 'Year',
              type: 'text',
              placeholder: 'e.g., 2024',
            },
          ],
        },
        {
          id: 'hospitalUnit',
          label: 'What hospital unit/department did this interaction occur?',
          type: 'text',
        },
        {
          id: 'clinicianNames',
          label: 'Please list the names of any clinicians you remember during this interaction.',
          type: 'textarea',
        },
        {
          id: 'hospitalInteraction',
          label: 'Please describe your hospital interaction experience.',
          type: 'textarea',
        },
        {
          id: 'contactForAdvocacy',
          label: 'Would you like to be contacted by SCAGO for advocacy and support?',
          type: 'boolean-checkbox',
        },
        {
          id: 'rating',
          label: 'Overall Experience Rating',
          type: 'rating',
        },
      ],
    },
  ],
};
