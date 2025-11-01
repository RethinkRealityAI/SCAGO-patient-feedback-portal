import bcrypt from 'bcryptjs';

// Types for Youth Empowerment Program
export interface YEPParticipant {
  id: string;
  youthParticipant: string;
  age?: number;
  email?: string; // Made optional to handle empty submissions
  etransferEmailAddress?: string;
  phoneNumber?: string;
  emergencyContactRelationship?: string;
  emergencyContactNumber?: string;
  region?: string; // Made optional to handle empty submissions
  mailingAddress?: string;
  // Separate address fields
  streetAddress?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  projectCategory?: string;
  projectInANutshell?: string;
  contractSigned?: boolean; // Made optional with default false
  signedSyllabus?: boolean; // Made optional with default false
  availability?: string; // Made optional to handle empty submissions
  assignedMentor?: string; // Made optional to handle empty submissions
  idProvided?: boolean; // Made optional with default false
  canadianStatus?: 'Canadian Citizen' | 'Permanent Resident' | 'Other'; // Made optional
  sin?: string;
  sinNumber?: string;
  sinLast4: string; // Required for security - always store last 4 digits
  sinHash: string; // Required for security - always store hash
  youthProposal?: string; // Made optional to handle empty submissions
  affiliationWithSCD?: string;
  proofOfAffiliationWithSCD?: boolean; // Made optional with default false
  scagoCounterpart?: string; // Made optional to handle empty submissions
  dob?: string; // Made optional to handle empty submissions
  file?: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  // User-uploaded document URLs
  healthCardUrl?: string;
  healthCardFileName?: string;
  healthCardFileType?: string;
  photoIdUrl?: string;
  photoIdFileName?: string;
  photoIdFileType?: string;
  consentFormUrl?: string;
  consentFormFileName?: string;
  consentFormFileType?: string;
  // Additional documents (user-uploaded random documents)
  additionalDocuments?: Array<{
    url: string;
    fileName: string;
    fileType: string;
    uploadedAt: Date | string;
  }>;
  // Additional legacy fields
  approved?: boolean; // Made optional with default false
  canadianStatusOther?: string; // Made optional
  citizenshipStatus?: string;
  location?: string;
  duties?: string;
  notes?: string;
  nextSteps?: string;
  interviewed?: boolean;
  interviewNotes?: string;
  recruited?: boolean;
  // Auth and Profile fields
  userId?: string; // Firebase Auth UID when claimed
  authEmail?: string; // Email used for auth (may differ from contact email)
  profileCompleted?: boolean; // Has user completed their profile?
  inviteCode?: string; // Optional invite code for claiming
  lastLoginAt?: Date; // Track last login
  createdAt: Date;
  updatedAt: Date;
}

export interface YEPMentor {
  id: string;
  name: string;
  title?: string;
  email?: string;
  phone?: string;
  vulnerableSectorCheck?: boolean;
  contractSigned?: boolean;
  availability?: string;
  assignedStudents: string[];
  file?: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  // User-uploaded document URLs
  policeCheckUrl?: string;
  policeCheckFileName?: string;
  policeCheckFileType?: string;
  resumeUrl?: string;
  resumeFileName?: string;
  resumeFileType?: string;
  referencesUrl?: string;
  referencesFileName?: string;
  referencesFileType?: string;
  // Document status flags (for tracking)
  resumeProvided?: boolean;
  referencesProvided?: boolean;
  // Auth and Profile fields
  userId?: string; // Firebase Auth UID when claimed
  authEmail?: string; // Email used for auth (may differ from contact email)
  profileCompleted?: boolean; // Has user completed their profile?
  inviteCode?: string; // Optional invite code for claiming
  lastLoginAt?: Date; // Track last login
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

export interface YEPMessage {
  id: string;
  senderId: string;          // userId of sender
  senderRole: 'participant' | 'mentor';
  senderName: string;        // Name for display
  recipientId: string;       // userId of recipient
  recipientRole: 'participant' | 'mentor';
  recipientName: string;
  subject: string;
  content: string;
  read: boolean;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface YEPMeeting {
  id: string;
  participantId: string;     // Document ID from yep_participants
  participantUserId: string; // Firebase Auth userId
  participantName: string;
  mentorId: string;          // Document ID from yep_mentors
  mentorUserId: string;      // Firebase Auth userId
  mentorName: string;
  requestedBy: 'participant' | 'mentor';
  title: string;
  description?: string;
  proposedDate: Date;
  proposedTime: string;      // e.g., "14:00"
  duration: number;          // in minutes
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  location?: string;         // Virtual/In-person
  meetingLink?: string;      // Zoom/Google Meet link
  rejectionReason?: string;
  approvedAt?: Date;
  rejectedAt?: Date;
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
  email: (value: string) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
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
  'Oakville',
  'Edmonton',
  'Mississauga',
  'London',
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

// Firestore ID Validation
export function looksLikeFirestoreId(str: string): boolean {
  return str.length === 20 && /^[a-zA-Z0-9]{20}$/.test(str);
}

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
