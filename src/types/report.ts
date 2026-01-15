import { z } from 'zod';

export const NON_CLINIC_CATEGORIES = [
    'admission',
    'inpatient',
    'outpatient',
    'er',
    'ed',
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

// Helper schemas
const dateLogSchema = z.object({
    date: z.date(),
    time: z.string().optional(), // HH:MM format
    notes: z.string().optional(),
});

const interactionLogSchema = z.object({
    patientId: z.string().optional(), // Optional, in case they want to link to a specific patient
    date: z.date(),
    time: z.string().optional(),
    supportTypes: z.array(z.string()),
    otherSupportDetails: z.string().optional(),
});

// Hemoglobinopathy Clinic Metrics Schema
export const hemoglobinopathyMetricsSchema = z.object({
    patientCounts: z.object({
        adult: z.number().default(0),
        pediatric: z.number().default(0),
        newAdult: z.number().default(0),
        newPediatric: z.number().default(0),
    }),
    waitTimes: z.string().optional(),
    referrals: z.number().default(0),
    qualityOfCare: z.object({
        er: z.object({
            total: z.number().default(0),
            adult: z.number().default(0),
            pediatric: z.number().default(0),
        }),
        admission: z.object({
            total: z.number().default(0),
            adult: z.number().default(0),
            pediatric: z.number().default(0),
        }),
        subQualityEr: z.object({
            total: z.number().default(0),
            adult: z.number().default(0),
            pediatric: z.number().default(0),
        }),
        subQualityAdmission: z.object({
            total: z.number().default(0),
            adult: z.number().default(0),
            pediatric: z.number().default(0),
        }),
    }),
    // Section iii in the form (Support received)
    support: z.object({
        erVisit: z.object({
            adult: z.array(z.string()).default([]),
            pediatric: z.array(z.string()).default([]),
        }),
        postDischarge: z.object({
            adult: z.array(z.string()).default([]),
            pediatric: z.array(z.string()).default([]),
        }),
        routineVisit: z.object({
            adult: z.array(z.string()).default([]),
            pediatric: z.array(z.string()).default([]),
        }),
    }),
    notApplicable: z.boolean().default(false),
});

// Non-Hemoglobinopathy Clinic Metrics Schema
export const nonClinicCategorySchema = z.object({
    category: z.enum(NON_CLINIC_CATEGORIES),
    count: z.number().default(0),
    interactions: z.string().default(''), // Simplified to text log for flexibility
    supportTypes: z.array(z.string()).default([]), // Added support types list
    notApplicable: z.boolean().default(false),
});

export const nonHemoglobinopathyMetricsSchema = z.object({
    categories: z.array(nonClinicCategorySchema).default([]),
});

// Main Report Schema
export const programReportSchema = z.object({
    id: z.string().optional(),
    month: z.number().min(1).max(12),
    year: z.number().min(2024),
    hospital: z.string().min(1, 'Hospital is required'),

    hemoglobinopathyMetrics: hemoglobinopathyMetricsSchema,
    nonHemoglobinopathyMetrics: nonHemoglobinopathyMetricsSchema,

    createdBy: z.string().optional(),
    createdAt: z.date().optional(),
    updatedAt: z.date().optional(),
});

export type ProgramReport = z.infer<typeof programReportSchema>;
export type NonClinicCategory = z.infer<typeof nonClinicCategorySchema>;
export type InteractionLog = z.infer<typeof interactionLogSchema>;
