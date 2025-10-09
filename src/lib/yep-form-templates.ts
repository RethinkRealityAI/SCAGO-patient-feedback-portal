import { YEPFormTemplate, YEPFormCategory, YEPFormField } from './yep-forms-types';
import { nanoid } from 'nanoid';

// Helper function to create a field
function createField(
  label: string, 
  type: YEPFormField['type'], 
  options?: Partial<YEPFormField>
): YEPFormField {
  return {
    id: nanoid(),
    label,
    type,
    validation: { required: true },
    ...options,
  };
}

// Helper function to create a section
function createSection(title: string, fields: YEPFormField[]) {
  return {
    id: nanoid(),
    title,
    fields,
  };
}

// 1. Mentor Form Template
export const mentorFormTemplate: Omit<YEPFormTemplate, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'version'> = {
  name: 'Mentor Registration Form',
  description: 'Form for registering new mentors and updating mentor information',
  category: YEPFormCategory.MENTOR,
  targetEntity: 'mentor',
  isTemplate: true,
  isActive: true,
  sections: [
    createSection('Mentor Information', [
      createField('Mentor Name', 'text', {
        placeholder: 'Enter full name',
        validation: { required: true },
      }),
      createField('Title/Role', 'yep-mentor-lookup', {
        helperText: 'Select or create a mentor title/role',
        validation: { required: true },
      }),
    ]),
    createSection('Student Assignments', [
      createField('Assigned Students', 'yep-participant-assignment', {
        helperText: 'Select which participants this mentor will work with',
        validation: { required: false },
      }),
    ]),
  ],
};

// 2. Participant Form Template
export const participantFormTemplate: Omit<YEPFormTemplate, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'version'> = {
  name: 'Participant Registration Form',
  description: 'Comprehensive form for registering youth participants in the program',
  category: YEPFormCategory.PARTICIPANT,
  targetEntity: 'participant',
  isTemplate: true,
  isActive: true,
  sections: [
    createSection('Basic Information', [
      createField('Youth Participant Name', 'text', {
        placeholder: 'Enter full name',
        validation: { required: true },
      }),
      createField('Email Address', 'email', {
        placeholder: 'participant@example.com',
        validation: { required: true },
      }),
      createField('Region', 'select', {
        options: [
          { id: nanoid(), label: 'Northern Ontario', value: 'northern-ontario' },
          { id: nanoid(), label: 'Quebec', value: 'quebec' },
          { id: nanoid(), label: 'Toronto', value: 'toronto' },
          { id: nanoid(), label: 'Etobicoke', value: 'etobicoke' },
          { id: nanoid(), label: 'Ottawa', value: 'ottawa' },
          { id: nanoid(), label: 'Other', value: 'other' },
        ],
        validation: { required: true },
      }),
      createField('Date of Birth', 'date', {
        validation: { required: true },
      }),
    ]),
    createSection('Status & Documents', [
      createField('Approved', 'boolean-checkbox', {
        helperText: 'Participant has been approved for the program',
        validation: { required: false },
      }),
      createField('Contract Signed', 'boolean-checkbox', {
        helperText: 'Participant has signed the program contract',
        validation: { required: false },
      }),
      createField('Signed Syllabus', 'boolean-checkbox', {
        helperText: 'Participant has signed the program syllabus',
        validation: { required: false },
      }),
      createField('ID Provided', 'boolean-checkbox', {
        helperText: 'Participant has provided valid identification',
        validation: { required: false },
      }),
      createField('Proof of SCD Affiliation', 'boolean-checkbox', {
        helperText: 'Participant has provided proof of SCD affiliation',
        validation: { required: false },
      }),
    ]),
    createSection('Program Details', [
      createField('Availability', 'textarea', {
        placeholder: 'e.g., Mon–Wed, 4:00–9:00',
        helperText: 'Describe when the participant is available',
        validation: { required: false },
      }),
      createField('Assigned Mentor', 'yep-mentor-lookup', {
        helperText: 'Select the mentor assigned to this participant',
        validation: { required: false },
      }),
      createField('SCAGO Counterpart', 'text', {
        placeholder: 'Staff member name',
        helperText: 'SCAGO staff member assigned to this participant',
        validation: { required: false },
      }),
    ]),
    createSection('Legal & Security', [
      createField('Canadian Status', 'select', {
        options: [
          { id: nanoid(), label: 'Canadian Citizen', value: 'canadian-citizen' },
          { id: nanoid(), label: 'Permanent Resident', value: 'permanent-resident' },
          { id: nanoid(), label: 'Other', value: 'other' },
        ],
        validation: { required: true },
      }),
      createField('SIN (Social Insurance Number)', 'yep-sin-secure', {
        placeholder: 'Enter SIN (will be securely hashed)',
        helperText: 'Only the last 4 digits will be stored for reference',
        validation: { required: false },
      }),
    ]),
    createSection('Project Information', [
      createField('Youth Proposal', 'textarea', {
        placeholder: 'Describe the youth\'s project proposal...',
        helperText: 'Detailed description of the proposed project',
        validation: { required: false },
      }),
    ]),
    createSection('Document Upload', [
      createField('Supporting Documents', 'yep-file-secure', {
        helperText: 'Upload supporting documents (PDF, DOC, images)',
        validation: { required: false },
      }),
    ]),
  ],
};

// 3. Workshop Form Template
export const workshopFormTemplate: Omit<YEPFormTemplate, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'version'> = {
  name: 'Workshop Registration Form',
  description: 'Form for creating and managing workshops in the program',
  category: YEPFormCategory.WORKSHOP,
  targetEntity: 'workshop',
  isTemplate: true,
  isActive: true,
  sections: [
    createSection('Workshop Details', [
      createField('Workshop Title', 'text', {
        placeholder: 'Enter workshop title',
        validation: { required: true },
      }),
      createField('Description', 'textarea', {
        placeholder: 'Describe the workshop content and objectives...',
        helperText: 'Provide a detailed description of what participants will learn',
        validation: { required: true },
      }),
      createField('Workshop Date', 'date', {
        validation: { required: true },
      }),
      createField('Capacity', 'number', {
        placeholder: 'Maximum participants',
        helperText: 'Maximum number of participants',
        validation: { required: false },
      }),
    ]),
    createSection('Location & Logistics', [
      createField('Location', 'text', {
        placeholder: 'e.g., SCAGO Office, Online, Community Center',
        helperText: 'Physical location or online platform',
        validation: { required: false },
      }),
    ]),
    createSection('Feedback Survey', [
      createField('Feedback Survey', 'select', {
        helperText: 'Choose a survey to collect feedback from participants',
        validation: { required: false },
      }),
    ]),
  ],
};

// 4. Meeting Form Template
export const meetingFormTemplate: Omit<YEPFormTemplate, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'version'> = {
  name: 'Advisor Meeting Form',
  description: 'Form for recording advisor meetings with participants',
  category: YEPFormCategory.MEETING,
  targetEntity: 'meeting',
  isTemplate: true,
  isActive: true,
  sections: [
    createSection('Meeting Participants', [
      createField('Participant', 'yep-participant-lookup', {
        helperText: 'Select the participant for this meeting',
        validation: { required: true },
      }),
      createField('Advisor', 'yep-mentor-lookup', {
        helperText: 'Select the advisor for this meeting',
        validation: { required: true },
      }),
    ]),
    createSection('Meeting Details', [
      createField('Meeting Date & Time', 'datetime', {
        validation: { required: true },
      }),
      createField('Duration (minutes)', 'number', {
        placeholder: 'e.g., 60',
        helperText: 'How long did the meeting last?',
        validation: { required: false },
      }),
    ]),
    createSection('Meeting Topics', [
      createField('Discussion Topics', 'yep-meeting-topics', {
        helperText: 'What was discussed during the meeting?',
        validation: { required: false },
      }),
    ]),
    createSection('Meeting Notes', [
      createField('Notes', 'textarea', {
        placeholder: 'Record key discussion points, decisions made, next steps, and any important outcomes...',
        helperText: 'Detailed notes about what was discussed and any action items',
        validation: { required: false },
      }),
    ]),
  ],
};

// 5. Bulk Attendance Form Template
export const bulkAttendanceFormTemplate: Omit<YEPFormTemplate, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'version'> = {
  name: 'Bulk Workshop Attendance Form',
  description: 'Form for recording attendance for multiple participants at a workshop',
  category: YEPFormCategory.BULK_ATTENDANCE,
  targetEntity: 'bulk_attendance',
  isTemplate: true,
  isActive: true,
  sections: [
    createSection('Workshop Information', [
      createField('Workshop', 'yep-workshop-selector', {
        helperText: 'Select the workshop for attendance recording',
        validation: { required: true },
      }),
    ]),
    createSection('Attendance Records', [
      createField('Attendance Data', 'yep-attendance-bulk', {
        helperText: 'Record attendance for multiple participants',
        validation: { required: true },
      }),
    ]),
  ],
};

// 6. Bulk Meeting Form Template
export const bulkMeetingFormTemplate: Omit<YEPFormTemplate, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'version'> = {
  name: 'Bulk Meeting Recording Form',
  description: 'Form for recording multiple advisor meetings at once',
  category: YEPFormCategory.BULK_MEETING,
  targetEntity: 'bulk_meeting',
  isTemplate: true,
  isActive: true,
  sections: [
    createSection('Meeting Records', [
      createField('Meeting Data', 'yep-meeting-bulk', {
        helperText: 'Record multiple advisor meetings',
        validation: { required: true },
      }),
    ]),
  ],
};

// Export all templates
export const yepFormTemplates = [
  mentorFormTemplate,
  participantFormTemplate,
  workshopFormTemplate,
  meetingFormTemplate,
  bulkAttendanceFormTemplate,
  bulkMeetingFormTemplate,
];

// Helper function to get template by category
export function getTemplateByCategory(category: YEPFormCategory) {
  return yepFormTemplates.find(template => template.category === category);
}

// Helper function to get template by target entity
export function getTemplateByTargetEntity(targetEntity: string) {
  return yepFormTemplates.find(template => template.targetEntity === targetEntity);
}

// Helper function to get all templates
export function getAllTemplates() {
  return yepFormTemplates;
}
