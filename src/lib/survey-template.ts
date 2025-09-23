// This file contains the default structure for the main patient feedback survey.
// It is used to seed the database if no survey document is found.

export const defaultSurvey = {
  id: 'main-feedback',
  title: 'Patient Care Feedback Form',
  description:
    'This form is for collecting feedback on patient experiences with the Ontario healthcare system.',
  sections: [
    {
      id: 'personal-info',
      title: 'Personal Information',
      description:
        'Please provide some basic information. This section is optional.',
      fields: [
        {
          id: 'isAnonymous',
          label: 'I prefer to submit my feedback anonymously',
          type: 'boolean-checkbox',
          defaultValue: false,
        },
        {
          id: 'personal-details',
          type: 'group',
          conditionField: 'isAnonymous',
          conditionValue: false,
          label: 'Personal Details',
          fields: [
            {
              id: 'name',
              label: 'Name',
              type: 'text',
              placeholder: 'Your Name',
            },
            {
              id: 'email',
              label: 'Email Address',
              type: 'email',
              placeholder: 'your.email@example.com',
            },
          ],
        },
        {
          id: 'patientOrCaregiver',
          label: 'Are you a patient or a caregiver?',
          type: 'radio',
          required: true,
          options: [
            { label: 'Patient', value: 'patient' },
            { label: 'Caregiver', value: 'caregiver' },
          ],
        },
      ],
    },
    {
      id: 'hospital-interaction',
      title: 'Hospital Interaction Details',
      description:
        'Tell us about the specific interaction you are providing feedback on.',
      fields: [
        {
          id: 'location',
          label: 'Name of Hospital / Health Centre',
          type: 'text',
          placeholder: 'e.g., Toronto General Hospital',
          required: true,
        },
        {
          id: 'interaction-date',
          label: 'Interaction Date',
          type: 'group',
          fields: [
            {
              id: 'interactionMonth',
              label: 'Month of Interaction',
              type: 'select',
              placeholder: 'Select a month',
              options: [
                { value: 'January', label: 'January' },
                { value: 'February', label: 'February' },
                { value: 'March', label: 'March' },
                { value: 'April', label: 'April' },
                { value: 'May', label: 'May' },
                { value: 'June', label: 'June' },
                { value: 'July', label: 'July' },
                { value: 'August', label: 'August' },
                { value: 'September', label: 'September' },
                { value: 'October', label: 'October' },
                { value: 'November', label: 'November' },
                { value: 'December', label: 'December' },
              ],
            },
            {
              id: 'interactionYear',
              label: 'Year of Interaction',
              type: 'text',
              placeholder: 'e.g., 2024',
            },
          ],
        },
        {
          id: 'visitReason',
          label: 'What was the primary reason for this hospital interaction?',
          type: 'text',
          placeholder: 'e.g., Vaso-occlusive Crisis (VOC)',
        },
        {
          id: 'inPainCrisis',
          label:
            'Were you in a pain crisis (VOC) during this interaction?',
          type: 'radio',
          options: [
            { label: 'Yes', value: 'yes' },
            { label: 'No', value: 'no' },
          ],
        },
        {
          id: 'analgesiaTime',
          label:
            'How long did it take to receive analgesia (pain relief) from the time you presented at triage?',
          type: 'select',
          conditionField: 'inPainCrisis',
          conditionValue: 'yes',
          placeholder: 'Select a time frame',
          options: [
            { value: '0-30', label: '0-30 minutes' },
            { value: '31-60', label: '31-60 minutes' },
            { value: '61-90', label: '61-90 minutes' },
            { value: '91-120', label: '91-120 minutes' },
            { value: '120+', label: 'More than 2 hours' },
          ],
        },
      ],
    },
    {
      id: 'care-experience',
      title: 'Care Experience',
      description:
        'Please describe the quality of care you received during your visit.',
      fields: [
        {
          id: 'hcpFamiliarity',
          label:
            'How familiar were the healthcare providers with Sickle Cell Disease?',
          type: 'radio',
          options: [
            { label: 'Very Familiar', value: 'very_familiar' },
            { label: 'Somewhat Familiar', value: 'somewhat_familiar' },
            { label: 'Not Familiar', value: 'not_familiar' },
          ],
        },
        {
          id: 'experienced',
          label: 'Did you experience any of the following? (Select all that apply)',
          type: 'checkbox',
          options: [
            { value: 'attentive_staff', label: 'Staff were attentive and caring' },
            { value: 'long_wait_times', label: 'Long wait times' },
            { value: 'clear_communication', label: 'Communication was clear and helpful' },
            { value: 'dismissive_attitude', label: 'Staff had a dismissive or unbelieving attitude' },
            { value: 'effective_pain_management', label: 'Pain was managed effectively' },
            { value: 'lack_of_empathy', label: 'Lack of empathy or understanding from staff' },
          ],
        },
        {
          id: 'feedbackText',
          label: 'Please describe your experience in your own words.',
          type: 'textarea',
          placeholder: 'Share details about what went well and what could be improved. Your feedback is valuable.',
        },
        {
            id: 'rating',
            label: 'Overall, how would you rate your experience?',
            type: 'rating',
            required: true,
        }
      ],
    },
    {
      id: 'follow-up',
      title: 'Reporting and Follow-Up',
      description:
        'Please provide information about any follow-up actions taken.',
      fields: [
        {
          id: 'reportedToHospital',
          label: 'Did you report this experience to the hospital leadership or Patient Ombudsman?',
          type: 'radio',
          options: [
            { label: 'Yes', value: 'yes' },
            { label: 'No', value: 'no' },
          ],
        },
        {
          id: 'reportOutcome',
          label: 'If yes, what was the outcome?',
          type: 'textarea',
          conditionField: 'reportedToHospital',
          conditionValue: 'yes',
          placeholder: 'Describe the response or resolution you received.',
        },
        {
          id: 'reportNotDoneReason',
          label: 'If no, why did you not report it?',
          type: 'select',
          conditionField: 'reportedToHospital',
          conditionValue: 'no',
          placeholder: 'Select a reason',
          options: [
            { value: 'did_not_know_how', label: 'I did not know how to report it' },
            { value: 'fear_of_reprisal', label: 'I was afraid of negative consequences' },
            { value: 'effort_too_high', label: 'It seemed like too much effort' },
            { value: 'felt_powerless', label: 'I felt it would not make a difference' },
            { value: 'other', label: 'Other' },
          ],
        },
        {
            id: 'contactForAdvocacy',
            label: 'A SCAGO advocate may contact you for more information to support our advocacy efforts. Do you consent to be contacted?',
            type: 'boolean-checkbox',
            description: 'Your contact information will only be used for this purpose and will not be shared without your explicit consent.'
        }
      ],
    },
  ],
};
