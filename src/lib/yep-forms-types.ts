import { z } from 'zod';

// YEP Form Categories
export enum YEPFormCategory {
  MENTOR = 'mentor',
  PARTICIPANT = 'participant', 
  WORKSHOP = 'workshop',
  MEETING = 'meeting',
  ATTENDANCE = 'attendance',
  BULK_ATTENDANCE = 'bulk_attendance',
  BULK_MEETING = 'bulk_meeting'
}

// YEP-specific field types
export enum YEPFieldType {
  yepParticipantLookup = 'yepParticipantLookup',
  yepMentorLookup = 'yepMentorLookup',
  yepSIN = 'yepSIN',
  yepMentorAssignment = 'yepMentorAssignment',
  yepParticipantAssignment = 'yepParticipantAssignment',
  yepWorkshopSelector = 'yepWorkshopSelector',
  yepMeetingTopics = 'yepMeetingTopics',
  yepAttendanceBulk = 'yepAttendanceBulk',
  yepFileSecure = 'yepFileSecure'
}

// Extended field type union (includes all survey types + YEP types)
export type ExtendedFieldType = 
  | 'text' | 'textarea' | 'email' | 'phone' | 'url' | 'date' | 'time' | 'time-amount' | 'number' 
  | 'digital-signature' | 'select' | 'radio' | 'checkbox' | 'slider' | 'rating' | 'nps' 
  | 'group' | 'boolean-checkbox' | 'anonymous-toggle' | 'province-ca' | 'city-on' | 'hospital-on' 
  | 'department-on' | 'duration-hm' | 'duration-dh' | 'file-upload' | 'multi-text' | 'matrix-single' 
  | 'matrix-multiple' | 'likert-scale' | 'pain-scale' | 'calculated' | 'ranking' | 'datetime' 
  | 'color' | 'range' | 'percentage' | 'currency'
  | keyof typeof YEPFieldType;

// YEP Form Field Configuration
export interface YEPFormField {
  id: string;
  label: string;
  type: ExtendedFieldType;
  options?: Array<{ id: string; label: string; value: string }>;
  fields?: YEPFormField[]; // For group fields
  conditionField?: string;
  conditionValue?: string;
  required?: boolean;
  validation?: {
    required?: boolean;
    pattern?: string;
  };
  min?: number;
  max?: number;
  step?: number;
  minLength?: number;
  maxLength?: number;
  rows?: Array<{ id: string; label: string; value: string }>;
  columns?: Array<{ id: string; label: string; value: string }>;
  calculation?: string;
  fileTypes?: string[];
  maxFileSize?: number;
  maxFiles?: number;
  placeholder?: string;
  helperText?: string;
  prefix?: string;
  suffix?: string;
  // YEP-specific field properties
  yepConfig?: {
    targetEntity?: 'participant' | 'mentor' | 'workshop' | 'meeting';
    allowCreate?: boolean;
    multipleSelection?: boolean;
    secureField?: boolean;
    bulkEntry?: boolean;
  };
}

// YEP Form Section
export interface YEPFormSection {
  id: string;
  title: string;
  description?: string;
  allRequired?: boolean;
  fields: YEPFormField[];
}

// YEP Form Template
export interface YEPFormTemplate {
  id: string;
  name: string;
  description?: string;
  category: YEPFormCategory;
  targetEntity: 'participant' | 'mentor' | 'workshop' | 'meeting' | 'attendance' | 'bulk_attendance' | 'bulk_meeting';
  sections: YEPFormSection[];
  isTemplate: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  version: number;
}

// YEP Form Submission
export interface YEPFormSubmission {
  id: string;
  formTemplateId: string;
  submittedBy: string;
  submittedAt: Date;
  data: Record<string, any>;
  processedAt?: Date;
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  errorMessage?: string;
  createdEntities?: {
    participantIds?: string[];
    mentorIds?: string[];
    workshopIds?: string[];
    meetingIds?: string[];
    attendanceIds?: string[];
  };
}

// Validation Schemas
export const yepFormFieldSchema: z.ZodType<YEPFormField> = z.lazy(() => z.object({
  id: z.string(),
  label: z.string().min(1, 'Field label is required'),
  type: z.custom<ExtendedFieldType>((val) => typeof val === 'string', {
    message: 'Invalid field type'
  }) as unknown as z.ZodType<ExtendedFieldType>,
  options: z.array(z.object({
    id: z.string(),
    label: z.string(),
    value: z.string()
  })).optional(),
  fields: z.array(yepFormFieldSchema).optional(),
  conditionField: z.string().optional(),
  conditionValue: z.string().optional(),
  validation: z.object({
    required: z.boolean().optional(),
    pattern: z.string().optional(),
  }).optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().optional(),
  minLength: z.number().optional(),
  maxLength: z.number().optional(),
  rows: z.array(z.object({
    id: z.string(),
    label: z.string(),
    value: z.string()
  })).optional(),
  columns: z.array(z.object({
    id: z.string(),
    label: z.string(),
    value: z.string()
  })).optional(),
  calculation: z.string().optional(),
  fileTypes: z.array(z.string()).optional(),
  maxFileSize: z.number().optional(),
  maxFiles: z.number().optional(),
  placeholder: z.string().optional(),
  helperText: z.string().optional(),
  prefix: z.string().optional(),
  suffix: z.string().optional(),
  yepConfig: z.object({
    targetEntity: z.enum(['participant', 'mentor', 'workshop', 'meeting']).optional(),
    allowCreate: z.boolean().optional(),
    multipleSelection: z.boolean().optional(),
    secureField: z.boolean().optional(),
    bulkEntry: z.boolean().optional(),
  }).optional(),
}));

export const yepFormSectionSchema = z.object({
  id: z.string(),
  title: z.string().min(1, 'Section title is required'),
  allRequired: z.boolean().default(false).optional(),
  fields: z.array(yepFormFieldSchema),
});

export const yepFormTemplateSchema = z.object({
  name: z.string().min(1, 'Form name is required'),
  description: z.string().optional(),
  category: z.nativeEnum(YEPFormCategory),
  targetEntity: z.enum(['participant', 'mentor', 'workshop', 'meeting', 'attendance', 'bulk_attendance', 'bulk_meeting']),
  sections: z.array(yepFormSectionSchema),
  isTemplate: z.boolean().default(true),
  isActive: z.boolean().default(true),
});

export const yepFormSubmissionSchema = z.object({
  formTemplateId: z.string(),
  data: z.record(z.any()),
});

// Type exports
export type YEPFormFieldConfig = YEPFormField;
export type YEPFormSectionConfig = YEPFormSection;
export type YEPFormTemplateConfig = YEPFormTemplate;
export type YEPFormSubmissionData = z.infer<typeof yepFormSubmissionSchema>;

// Utility functions
export function isYEPFieldType(type: string): type is YEPFieldType {
  return Object.keys(YEPFieldType).includes(type as YEPFieldType);
}

export function getYEPFieldTypeConfig(type: YEPFieldType) {
  const configs: Record<YEPFieldType, Partial<YEPFormField['yepConfig']>> = {
    [YEPFieldType.yepParticipantLookup]: {
      targetEntity: 'participant',
      allowCreate: true,
      multipleSelection: false,
    },
    [YEPFieldType.yepMentorLookup]: {
      targetEntity: 'mentor',
      allowCreate: true,
      multipleSelection: false,
    },
    [YEPFieldType.yepSIN]: {
      secureField: true,
    },
    [YEPFieldType.yepMentorAssignment]: {
      targetEntity: 'mentor',
      multipleSelection: true,
    },
    [YEPFieldType.yepParticipantAssignment]: {
      targetEntity: 'participant',
      multipleSelection: true,
    },
    [YEPFieldType.yepWorkshopSelector]: {
      targetEntity: 'workshop',
      multipleSelection: false,
    },
    [YEPFieldType.yepMeetingTopics]: {
      multipleSelection: true,
    },
    [YEPFieldType.yepAttendanceBulk]: {
      bulkEntry: true,
    },
    [YEPFieldType.yepFileSecure]: {
      secureField: true,
    },
  };
  
  return configs[type];
}
