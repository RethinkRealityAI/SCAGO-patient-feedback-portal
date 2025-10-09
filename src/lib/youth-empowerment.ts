import bcrypt from 'bcryptjs';

// Types for Youth Empowerment Program
export interface YEPParticipant {
  id: string;
  youthParticipant: string;
  email: string;
  etransferEmailAddress?: string;
  mailingAddress?: string;
  phoneNumber?: string;
  region: string;
  approved: boolean;
  contractSigned: boolean;
  signedSyllabus: boolean;
  availability: string;
  assignedMentor: string;
  idProvided: boolean;
  canadianStatus: 'Canadian Citizen' | 'Permanent Resident' | 'Other';
  canadianStatusOther: string;
  sinLast4: string;
  sinHash: string;
  youthProposal: string;
  proofOfAffiliationWithSCD: boolean;
  scagoCounterpart: string;
  dob: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  // New fields from current participants data
  age?: number;
  citizenshipStatus?: string;
  location?: string;
  projectCategory?: string;
  duties?: string;
  affiliationWithSCD?: string;
  notes?: string;
  nextSteps?: string;
  interviewed?: boolean;
  interviewNotes?: string;
  recruited?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface YEPMentor {
  id: string;
  name: string;
  title: string;
  assignedStudents: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface YEPWorkshop {
  id: string;
  title: string;
  description?: string;
  date: Date;
  time?: string;
  location?: string;
  capacity?: number;
  mentor?: string;
  notes?: string;
  feedbackSurveyId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface YEPWorkshopAttendance {
  id: string;
  workshopId: string;
  studentId: string;
  attendedAt: Date;
  notes?: string;
  createdAt: Date;
}

export interface YEPAdvisorMeeting {
  id: string;
  studentId: string;
  advisorId: string;
  meetingDate: Date;
  duration?: number;
  notes?: string;
  topics?: string[];
  createdAt: Date;
  updatedAt: Date;
}

// SIN Security Functions
export async function hashSIN(sin: string): Promise<string> {
  const saltRounds = 12;
  return await bcrypt.hash(sin, saltRounds);
}

export async function verifySIN(sin: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(sin, hash);
}

export function extractSINLast4(sin: string): string {
  // Remove any non-digit characters and get last 4 digits
  const cleanSIN = sin.replace(/\D/g, '');
  return cleanSIN.slice(-4);
}

export function validateSIN(sin: string): boolean {
  // Handle null, undefined, or empty string
  if (!sin || typeof sin !== 'string') return false;
  
  // Canadian SIN validation (9 digits, specific algorithm)
  const cleanSIN = sin.replace(/\D/g, '');
  
  if (cleanSIN.length !== 9) return false;
  
  // Check for invalid patterns (all same digits, etc.)
  if (/^(\d)\1{8}$/.test(cleanSIN)) return false;
  
  // Luhn algorithm for SIN validation
  let sum = 0;
  let isEven = false;
  
  for (let i = cleanSIN.length - 1; i >= 0; i--) {
    let digit = parseInt(cleanSIN[i]);
    
    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    
    sum += digit;
    isEven = !isEven;
  }
  
  return sum % 10 === 0;
}

// Lenient SIN validation for form inputs (matches component validation)
export function validateSINLenient(sin: string): boolean {
  if (!sin || typeof sin !== 'string') return false;
  
  const cleanSIN = sin.replace(/\D/g, '');
  
  if (cleanSIN.length !== 9) return false;
  
  // Only flag obviously invalid patterns
  if (/^(\d)\1{8}$/.test(cleanSIN)) return false; // All same digits
  if (cleanSIN.startsWith('000') || cleanSIN.startsWith('999')) return false; // Invalid prefixes
  
  return true; // Allow other 9-digit numbers
}

// File Upload Utilities
export function generateFileName(originalName: string, participantId: string): string {
  const timestamp = Date.now();
  const extension = originalName.split('.').pop();
  return `yep-files/${participantId}/${timestamp}-${originalName}`;
}

export function getFileTypeFromMime(mimeType: string): string {
  const mimeMap: Record<string, string> = {
    'application/pdf': 'PDF',
    'image/jpeg': 'JPEG',
    'image/png': 'PNG',
    'image/gif': 'GIF',
    'application/msword': 'DOC',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
    'text/plain': 'TXT',
  };
  
  return mimeMap[mimeType] || 'Unknown';
}

// Validation Schemas
export const participantValidation = {
  youthParticipant: (value: string) => value.length >= 2,
  email: (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
  region: (value: string) => value.length >= 2,
  sin: (value: string) => validateSIN(value),
  dob: (value: string) => {
    const date = new Date(value);
    const now = new Date();
    const age = now.getFullYear() - date.getFullYear();
    return age >= 16 && age <= 30; // YEP age range
  },
};

export const mentorValidation = {
  name: (value: string) => value.length >= 2,
  title: (value: string) => value.length >= 2,
};

export const workshopValidation = {
  title: (value: string) => value.length >= 3,
  description: (value: string) => value.length >= 10,
  date: (value: Date) => value > new Date(),
};

// Dashboard Filter Options
export const regionOptions = [
  'Northern Ontario',
  'Quebec', 
  'Toronto',
  'Etobicoke',
  'Ottawa',
  'Other'
];

export const canadianStatusOptions = [
  'Canadian Citizen',
  'Permanent Resident',
  'Other'
];

export const mentorTitleOptions = [
  'Senior Mentor',
  'Clinical Advisor',
  'Program Coordinator',
  'Research Supervisor',
  'Community Liaison',
  'Other'
];

// AI Analysis Configuration for YEP
export const yepAnalysisConfig = {
  participantInsights: [
    'Regional distribution analysis',
    'Approval rate trends',
    'Mentor assignment effectiveness',
    'Contract completion rates',
    'Proposal quality assessment'
  ],
  workshopInsights: [
    'Attendance patterns',
    'Feedback sentiment analysis',
    'Popular workshop topics',
    'Capacity utilization',
    'Geographic reach'
  ],
  mentorInsights: [
    'Mentor workload distribution',
    'Student-mentor matching effectiveness',
    'Meeting frequency analysis',
    'Mentor performance metrics'
  ]
};
