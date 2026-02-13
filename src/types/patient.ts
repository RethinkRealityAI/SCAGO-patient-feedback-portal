import { z } from 'zod';

// Enums and Constants
// SCAGO region taxonomy — now configurable via config/regions in Firestore.
// These are the default regions used when config is empty (migration/fallback).
export const DEFAULT_REGIONS = ['GTA', 'Hamilton-Wentworth', 'East', 'West', 'North', 'Unknown'] as const;
/** @deprecated Use getRegions() from server actions. Kept for backward compat during migration. */
export const REGIONS = DEFAULT_REGIONS;

/** Display label for the "Unknown" region in the UI (stored value remains "Unknown"). */
export const REGION_DISPLAY_UNKNOWN = 'Not assigned region';

/** Returns the user-facing label for a region (e.g. "Unknown" → "Not assigned region"). */
export function getRegionDisplayLabel(region: string): string {
    return region === 'Unknown' ? REGION_DISPLAY_UNKNOWN : region;
}

/** Returns region display label; when region is Unknown and intake city is set, appends it e.g. "Not assigned region (Toronto)". */
export function getRegionDisplayWithCity(
    region: string,
    intakeCity?: string | null
): string {
    const label = getRegionDisplayLabel(region);
    if (region === 'Unknown' && intakeCity?.trim()) return `${label} (${intakeCity.trim()})`;
    return label;
}
export const CLINIC_TYPES = ['adult', 'paediatric'] as const;
export const COMMUNICATION_METHODS = ['text', 'call', 'email'] as const;
export const CONSENT_STATUSES = ['on_file', 'not_obtained', 'withdrawn', 'expired'] as const;
export const CASE_STATUSES = ['active', 'inactive', 'closed', 'deceased'] as const;
export const INTERACTION_TYPES = [
    'phone_call',
    'follow_up',
    'event_support',
    'crisis_support',
    'er_visit',
    'inpatient_support',
    'outpatient_support',
    'admission_support',
    'routine_clinic_visit',
    'other'
] as const;

export const SUPPORT_TYPES = [
    'Advocacy support',
    'Info about SCAGO and services',
    'Psychosocial support',
    'Employment support',
    'Immigration or legal support',
    'Connection to financial supports/benefits',
    'Social prescribing (basic needs food, clothing, housing)',
    'Other'
] as const;

export const DOCUMENT_TYPES = ['consent_form', 'hospital_card', 'letter', 'referral', 'other'] as const;

export const PATIENT_NEEDS = [
    'housing',
    'school_accommodations',
    'financial_support',
    'transportation',
    'mental_health_support',
    'medical_equipment',
    'home_care',
    'respite_care',
    'peer_support',
    'advocacy',
    'legal_support',
    'employment_support',
    'pain_management',
    'er_support',
    'odsp_income_support',
    'food_security',
] as const;

export const FREQUENCIES = ['never', 'rarely', 'monthly', 'weekly', 'daily'] as const;

// Emergency Contact Schema
export const emergencyContactSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    relationship: z.string().min(1, 'Relationship is required'),
    phone: z.string().min(1, 'Phone is required'),
    email: z.string().email().optional().or(z.literal('')),
    isPrimary: z.boolean().default(false),
});

export type EmergencyContact = z.infer<typeof emergencyContactSchema>;

// Alert Schema
export const alertSchema = z.object({
    type: z.enum(['missing_consent', 'overdue_followup', 'custom']),
    message: z.string(),
    severity: z.enum(['low', 'medium', 'high']),
    createdAt: z.date(),
});

export type Alert = z.infer<typeof alertSchema>;

// Patient Schema
export const patientSchema = z.object({
    id: z.string().optional(),
    fullName: z.string().min(1, 'Full name is required'),
    dateOfBirth: z.coerce.date(),
    hospital: z.string().min(1, 'Hospital is required'),
    clinicType: z.enum(CLINIC_TYPES).optional(),
    mrn: z.string().optional(),
    region: z.string().min(1, 'Region is required'),
    diagnosis: z.string().min(1, 'Diagnosis is required'),
    contactInfo: z.object({
        email: z.string().email().optional().or(z.literal('')),
        phone: z.string().optional(),
        address: z.string().optional(),
    }),
    guardianContact: z.object({
        name: z.string().optional(),
        relation: z.string().optional(),
        contactInfo: z.object({
            email: z.string().email().optional().or(z.literal('')),
            phone: z.string().optional(),
        }).optional(),
        isAdult: z.boolean().default(true), // To track if patient is adult or child
    }).optional(),
    emergencyContacts: z.array(emergencyContactSchema).default([]),
    preferredCommunication: z.enum(COMMUNICATION_METHODS),
    consentStatus: z.enum(CONSENT_STATUSES),
    consentDate: z.coerce.date().optional(),
    referral: z.object({
        name: z.string().optional(),
        role: z.string().optional(),
        hospital: z.string().optional(),
        date: z.coerce.date().optional(),
        notes: z.string().optional(),
    }).optional(),
    caseStatus: z.enum(CASE_STATUSES).default('active'),
    needs: z.array(z.string()).default([]),
    painCrisisFrequency: z.string().optional(), // Could use FREQUENCIES enum
    erUsageFrequency: z.string().optional(),   // Could use FREQUENCIES enum
    notes: z.string().optional(),
    lastInteraction: z.object({
        date: z.coerce.date(),
        type: z.string(),
        summary: z.string(),
    }).optional(),
    alerts: z.array(alertSchema).default([]),
    supportProvided: z.object({
        letters: z.number().default(0),
        calls: z.number().default(0),
        resources: z.array(z.string()).default([]),
    }).optional(),
    createdAt: z.date().optional(),
    updatedAt: z.date().optional(),
    createdBy: z.string().optional(),
    createdByUid: z.string().optional(),
    // Intake linkage – when patient was created from consent form submission
    sourceSubmissionId: z.string().optional(),
    sourceSurveyId: z.string().optional(),
    /** City as entered/selected on the intake consent form (kept when region resolves to Unknown). */
    intakeCity: z.string().optional(),
    /** @deprecated Use intakeCity. Kept for backward compat. */
    intakeRegionResolution: z.string().optional(),
    intakeCandidateKey: z.string().optional(),
});

export type Patient = z.infer<typeof patientSchema>;

// Interaction Schema
export const interactionSchema = z.object({
    id: z.string().optional(),
    patientId: z.string(),
    date: z.coerce.date(),
    type: z.enum(INTERACTION_TYPES),
    category: z.string().optional(), // e.g. 'Hemoglobinopathy Clinic', 'ER', etc.
    supportTypes: z.array(z.string()).default([]),
    notes: z.string().min(1, 'Notes are required'),
    outcome: z.string().optional(),
    createdBy: z.string().optional(),
    createdAt: z.date().optional(),
});

export type PatientInteraction = z.infer<typeof interactionSchema>;

// Document Schema
export const patientDocumentSchema = z.object({
    id: z.string().optional(),
    patientId: z.string(),
    type: z.enum(DOCUMENT_TYPES),
    url: z.string().url(),
    path: z.string(),
    fileName: z.string(),
    uploadedAt: z.date(),
    uploadedBy: z.string(),
});

export type PatientDocument = z.infer<typeof patientDocumentSchema>;
