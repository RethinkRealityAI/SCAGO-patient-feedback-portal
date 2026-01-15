export interface FeedbackSubmission {
  id: string;
  rating?: number;
  hospitalInteraction?: string;
  submittedAt: Date;
  surveyId: string;
  sessionId?: string;

  // Hospital/Location fields
  hospital?: string;
  hospitalName?: string;
  'hospital-on'?: string;
  city?: string;
  primaryHospital?: string;

  // Clinical/Experience fields
  painScore?: number | string;
  painLevel?: number | string;
  waitTime?: string | { hours?: number; minutes?: number };
  lengthOfStay?: string | { days?: number; hours?: number };
  department?: string;

  // Consent/Intake fields
  firstName?: string;
  lastName?: string;
  email?: string;
  mayContact?: string; // 'yes' | 'no'
  joinMailingList?: string;
  joinSupportGroups?: string;
  consentToAdvocacy?: string;
  scdConnection?: string | string[];
  digitalSignature?: string;
  ageConfirmation?: boolean;

  // Index signature for flexible fields
  [key: string]: any;
}
