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
              { id: '1', label: 'Canadian Citizen', value: 'citizen' },
              { id: '2', label: 'Permanent Resident', value: 'permanent' },
              { id: '3', label: 'Other', value: 'other' }
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
  }
];