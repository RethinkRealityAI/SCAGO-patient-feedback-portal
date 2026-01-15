import { z } from 'zod';

// Enums and Constants
export const REGIONS = ['GTA', 'East', 'West', 'North'] as const;
export const CLINIC_TYPES = ['adult', 'paediatric'] as const;
export const COMMUNICATION_METHODS = ['text', 'call', 'email'] as const;
export const CONSENT_STATUSES = ['on_file', 'not_obtained', 'withdrawn', 'expired'] as const;
export const CASE_STATUSES = ['active', 'inactive', 'closed', 'deceased'] as const;
export const INTERACTION_TYPES = ['phone_call', 'follow_up', 'event_support', 'crisis_support'] as const;
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
    dateOfBirth: z.date(),
    hospital: z.string().min(1, 'Hospital is required'),
    clinicType: z.enum(CLINIC_TYPES).optional(),
    mrn: z.string().optional(),
    region: z.enum(REGIONS),
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
    consentDate: z.date().optional(),
    referral: z.object({
        name: z.string().optional(),
        role: z.string().optional(),
        hospital: z.string().optional(),
        date: z.date().optional(),
        notes: z.string().optional(),
    }).optional(),
    caseStatus: z.enum(CASE_STATUSES).default('active'),
    needs: z.array(z.string()).default([]),
    painCrisisFrequency: z.string().optional(), // Could use FREQUENCIES enum
    erUsageFrequency: z.string().optional(),   // Could use FREQUENCIES enum
    notes: z.string().optional(),
    lastInteraction: z.object({
        date: z.date(),
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
});

export type Patient = z.infer<typeof patientSchema>;

// Interaction Schema
export const interactionSchema = z.object({
    id: z.string().optional(),
    patientId: z.string(),
    date: z.date(),
    type: z.enum(INTERACTION_TYPES),
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
