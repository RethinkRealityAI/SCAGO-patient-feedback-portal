import { YEPFormCategory, YEPFormTemplate } from './yep-forms-types';

export const yepFormTemplates: YEPFormTemplate[] = [
  {
    id: 'mentor-template',
    name: 'Mentor Registration Form',
    description: 'Form for new mentors to register with the YEP program.',
    category: YEPFormCategory.MENTOR,
    targetEntity: 'mentor',
    isTemplate: true,
    isActive: true,
    sections: [
      {
        id: 'mentor-info',
        title: 'Mentor Information',
        description: 'Basic information about the mentor',
        fields: [
          {
            id: 'fullName',
            label: 'Full Name',
            type: 'text',
            required: true,
            placeholder: 'Enter full name'
          },
          {
            id: 'email',
            label: 'Email',
            type: 'email',
            required: true,
            placeholder: 'Enter email address'
          },
          {
            id: 'phone',
            label: 'Phone Number',
            type: 'text',
            required: false,
            placeholder: 'Enter phone number'
          },
          {
            id: 'title',
            label: 'Professional Title',
            type: 'text',
            required: true,
            placeholder: 'Enter professional title'
          },
          {
            id: 'areasOfInterest',
            label: 'Areas of Interest for Mentoring',
            type: 'textarea',
            required: false,
            placeholder: 'Describe areas of expertise and interest'
          }
        ]
      }
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'system',
    version: 1
  },
  {
    id: 'participant-template',
    name: 'Participant Registration Form',
    description: 'Form for youth participants to register for the YEP program.',
    category: YEPFormCategory.PARTICIPANT,
    targetEntity: 'participant',
    isTemplate: true,
    isActive: true,
    sections: [
      {
        id: 'participant-info',
        title: 'Participant Details',
        description: 'Personal information and program details',
        fields: [
          {
            id: 'youthParticipant',
            label: 'Full Name',
            type: 'text',
            required: true,
            placeholder: 'Enter full name'
          },
          {
            id: 'dob',
            label: 'Date of Birth',
            type: 'date',
            required: true
          },
          {
            id: 'email',
            label: 'Email',
            type: 'email',
            required: true,
            placeholder: 'Enter email address'
          },
          {
            id: 'phoneNumber',
            label: 'Phone Number',
            type: 'text',
            required: false,
            placeholder: 'Enter phone number'
          },
          {
            id: 'mailingAddress',
            label: 'Address',
            type: 'textarea',
            required: false,
            placeholder: 'Enter full address'
          },
          {
            id: 'region',
            label: 'Region',
            type: 'select',
            required: true,
            options: [
              { id: '1', label: 'Ontario', value: 'ontario' },
              { id: '2', label: 'Quebec', value: 'quebec' },
              { id: '3', label: 'British Columbia', value: 'bc' },
              { id: '4', label: 'Alberta', value: 'alberta' }
            ]
          },
          {
            id: 'canadianStatus',
            label: 'Canadian Status',
            type: 'select',
            required: true,
            options: [
              { id: '1', label: 'Canadian Citizen', value: 'Canadian Citizen' },
              { id: '2', label: 'Permanent Resident', value: 'Permanent Resident' },
              { id: '3', label: 'Other', value: 'Other' }
            ]
          },
          {
            id: 'age',
            label: 'Age',
            type: 'number',
            required: false,
            placeholder: 'Enter age'
          },
          {
            id: 'location',
            label: 'Location',
            type: 'text',
            required: false,
            placeholder: 'City, Province'
          },
          {
            id: 'projectCategory',
            label: 'Project Category',
            type: 'text',
            required: false,
            placeholder: 'e.g., Advocacy, Education, Community Engagement'
          },
          {
            id: 'duties',
            label: 'Duties/Responsibilities',
            type: 'textarea',
            required: false,
            placeholder: 'Describe specific duties and responsibilities'
          },
          {
            id: 'affiliationWithSCD',
            label: 'Affiliation with SCD',
            type: 'text',
            required: false,
            placeholder: 'e.g., Living with SCD, Advocate, Sibling of someone with SCD'
          },
          {
            id: 'interviewed',
            label: 'Interviewed',
            type: 'checkbox',
            required: false
          },
          {
            id: 'recruited',
            label: 'Recruited',
            type: 'checkbox',
            required: false
          }
        ]
      }
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'system',
    version: 1
  },
  {
    id: 'workshop-template',
    name: 'Workshop Management Form',
    description: 'Form to create and update YEP workshops.',
    category: YEPFormCategory.WORKSHOP,
    targetEntity: 'workshop',
    isTemplate: true,
    isActive: true,
    sections: [
      {
        id: 'workshop-details',
        title: 'Workshop Details',
        description: 'Information about the workshop',
        fields: [
          {
            id: 'title',
            label: 'Workshop Title',
            type: 'text',
            required: true,
            placeholder: 'Enter workshop title'
          },
          {
            id: 'description',
            label: 'Description',
            type: 'textarea',
            required: false,
            placeholder: 'Describe the workshop content and objectives'
          },
          {
            id: 'date',
            label: 'Workshop Date',
            type: 'date',
            required: true
          },
          {
            id: 'time',
            label: 'Time',
            type: 'text',
            required: false,
            placeholder: 'e.g., 10:00 AM - 12:00 PM'
          },
          {
            id: 'location',
            label: 'Location',
            type: 'text',
            required: false,
            placeholder: 'Enter workshop location'
          },
          {
            id: 'capacity',
            label: 'Capacity',
            type: 'number',
            required: false,
            placeholder: 'Maximum number of participants'
          }
        ]
      }
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'system',
    version: 1
  },
  {
    id: 'meeting-template',
    name: 'Meeting Record Form',
    description: 'Form to record details of advisor-participant meetings.',
    category: YEPFormCategory.MEETING,
    targetEntity: 'meeting',
    isTemplate: true,
    isActive: true,
    sections: [
      {
        id: 'meeting-details',
        title: 'Meeting Information',
        description: 'Details about the advisor meeting',
        fields: [
          {
            id: 'participantId',
            label: 'Participant',
            type: 'yepParticipantLookup',
            required: true
          },
          {
            id: 'mentorId',
            label: 'Mentor/Advisor',
            type: 'yepMentorLookup',
            required: true
          },
          {
            id: 'date',
            label: 'Date of Meeting',
            type: 'date',
            required: true
          },
          {
            id: 'duration',
            label: 'Duration (minutes)',
            type: 'number',
            required: false,
            placeholder: 'Meeting duration in minutes'
          },
          {
            id: 'notes',
            label: 'Meeting Notes',
            type: 'textarea',
            required: false,
            placeholder: 'Record key discussion points and outcomes'
          },
          {
            id: 'topics',
            label: 'Discussion Topics',
            type: 'yepMeetingTopics',
            required: false
          }
        ]
      }
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'system',
    version: 1
  },
  {
    id: 'bulk-attendance-template',
    name: 'Bulk Attendance Entry',
    description: 'Form for recording attendance for multiple participants at a workshop.',
    category: YEPFormCategory.BULK_ATTENDANCE,
    targetEntity: 'attendance',
    isTemplate: true,
    isActive: true,
    sections: [
      {
        id: 'bulk-attendance',
        title: 'Workshop Attendance',
        description: 'Record attendance for multiple participants',
        fields: [
          {
            id: 'workshopId',
            label: 'Select Workshop',
            type: 'yepWorkshopSelector',
            required: true
          },
          {
            id: 'attendanceRecords',
            label: 'Attendance Records',
            type: 'yepAttendanceBulk',
            required: true
          }
        ]
      }
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'system',
    version: 1
  },
  {
    id: 'bulk-meeting-template',
    name: 'Bulk Meeting Entry',
    description: 'Form for recording multiple advisor-participant meetings.',
    category: YEPFormCategory.BULK_MEETING,
    targetEntity: 'meeting',
    isTemplate: true,
    isActive: true,
    sections: [
      {
        id: 'bulk-meetings',
        title: 'Multiple Meeting Records',
        description: 'Record multiple meetings at once',
        fields: [
          {
            id: 'meetingRecords',
            label: 'Meeting Records',
            type: 'yepAttendanceBulk',
            required: true
          }
        ]
      }
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'system',
    version: 1
  },
  {
    id: 'board-recruitment-template',
    name: 'Board Recruitment Form',
    description: 'Standard Board Recruitment Form for: Sickle Cell Awareness Group of Ontario (SCAGO) Board of Director Positions',
    category: YEPFormCategory.BOARD_RECRUITMENT,
    targetEntity: 'mentor',
    isTemplate: true,
    isActive: true,
    sections: [
      {
        id: 'header-section',
        title: 'Board Member Application',
        fields: [
          {
            id: 'scago-logo',
            label: 'Organization Logo',
            type: 'logo',
            logoUrl: 'https://scagoalevelup.org/wp-content/uploads/2021/04/scago-logo-1.png',
            altText: 'SCAGO Logo',
            alignment: 'center',
            width: '240px'
          },
          {
            id: 'intro-text',
            label: '',
            type: 'text-block',
            helperText: "Thank you for your interest in the Sickle Cell Awareness Group of Ontario (SCAGO). We are looking for individuals who are passionate about our mission and willing to contribute their skills and experience to our board. Please complete this form to apply for a position on our Board of Directors.",
            validation: { required: false }
          }
        ]
      },
      {
        id: 'contact-info',
        title: 'Contact Information',
        fields: [
          {
            id: 'fullName',
            label: 'Full Name',
            type: 'text',
            validation: { required: true },
            placeholder: 'Enter your full name'
          },
          {
            id: 'primaryPhone',
            label: 'Primary Phone Number',
            type: 'phone',
            validation: { required: true },
            placeholder: '(555) 555-5555'
          },
          {
            id: 'email',
            label: 'Email Address',
            type: 'email',
            validation: { required: true },
            placeholder: 'name@example.com'
          }
        ]
      },
      {
        id: 'commitments',
        title: 'Commitment and Understanding',
        fields: [
          {
            id: 'term-commitment',
            label: 'The Term is for 3 years and there are approximately 4 meetings per year. Are you able to make this commitment?',
            type: 'boolean-row',
            validation: { required: true }
          },
          {
            id: 'confidentiality-agreement',
            label: 'Successful candidates will be asked to sign a Confidentiality Agreement and a Conflict of Interest statement. Are you willing to do this?',
            type: 'boolean-row',
            validation: { required: true }
          },
          {
            id: 'appendix-y-header',
            label: 'Appendix Y - Committee Support',
            type: 'text-block',
            helperText: "Appendix Y - Committee Support",
            className: "text-red-600 font-bold mt-6 mb-2 block"
          },
          {
            id: 'committee-support',
            label: 'Are you interested in supporting a specific SCAGO committee if not selected for the board?',
            type: 'boolean-row'
          },
          {
            id: 'preferred-committees',
            label: 'If yes, which committees are you interested in?',
            type: 'checkbox',
            conditionField: 'committee-support',
            conditionValue: 'true',
            options: [
              { id: 'advocacy', label: 'Advocacy', value: 'advocacy' },
              { id: 'fundraising', label: 'Fundraising', value: 'fundraising' },
              { id: 'programs', label: 'Programs & Services', value: 'programs' },
              { id: 'governance', label: 'Governance', value: 'governance' }
            ]
          }
        ]
      },
      {
        id: 'background-experience',
        title: 'Background and Experience',
        fields: [
          {
            id: 'board-experience-desc',
            label: 'Please describe your board experience or attach a separate sheet:',
            type: 'textarea',
            placeholder: 'Describe your previous experience serving on boards...'
          },
          {
            id: 'experience-attachment',
            label: 'Upload Experience Document (Optional)',
            type: 'file-upload',
            maxFiles: 1,
            fileTypes: ['.pdf', '.doc', '.docx'],
            helperText: 'You can upload a separate sheet describing your experience.'
          },
          {
            id: 'other-orgs',
            label: 'What other organizations do you currently serve on?',
            type: 'textarea',
            placeholder: 'List other organizations...'
          }
        ]
      },
      {
        id: 'references-section',
        title: 'References',
        fields: [
          {
            id: 'references-matrix',
            label: 'Please provide two references we may contact:',
            type: 'matrix-text',
            rows: [
              { id: 'ref1', label: 'Reference 1', value: 'ref1' },
              { id: 'ref2', label: 'Reference 2', value: 'ref2' }
            ],
            columns: [
              { id: 'ref-name', label: 'Name', value: 'name', type: 'text' },
              { id: 'ref-email', label: 'Email', value: 'email', type: 'email' },
              { id: 'ref-phone', label: 'Phone', value: 'phone', type: 'phone' }
            ]
          }
        ]
      },
      {
        id: 'supporting-docs',
        title: 'Supporting Documents',
        fields: [
          {
            id: 'resume-upload',
            label: 'Please forward your resume to recruitment@sicklecellanemia.ca or upload it here:',
            type: 'file-upload',
            maxFiles: 1,
            fileTypes: ['.pdf', '.doc', '.docx'],
            validation: { required: true }
          }
        ]
      },

    ],
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'system',
    version: 1
  }
];