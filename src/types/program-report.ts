export type ReportScope = 'single' | 'roster';

export interface ProgramReportSupportCounts {
    advocacySupport: number;
    infoAboutScagoServices: number;
    referralToCommunityConnections: number;
    psychosocialSupport: number;
    employmentSupport: number;
    immigrationOrLegalSupport: number;
    connectionToFinancialSupportsBenefits: number;
    socialPrescribingBasicNeeds: number;
    other: number;
}

/** Ordered support type labels for report display and PDF generation. */
export const PROGRAM_REPORT_SUPPORT_LABELS: Array<{ key: keyof ProgramReportSupportCounts; label: string }> = [
    { key: 'advocacySupport', label: 'Advocacy support' },
    { key: 'infoAboutScagoServices', label: 'Info about SCAGO and services' },
    { key: 'referralToCommunityConnections', label: 'Referral to community connections' },
    { key: 'psychosocialSupport', label: 'Psychosocial support' },
    { key: 'employmentSupport', label: 'Employment support' },
    { key: 'immigrationOrLegalSupport', label: 'Immigration or legal support' },
    { key: 'connectionToFinancialSupportsBenefits', label: 'Connection to financial supports / benefits' },
    { key: 'socialPrescribingBasicNeeds', label: 'Social prescribing (basic needs food, clothing, housing)' },
    { key: 'other', label: 'Other' },
];

export interface ProgramReportData {
    scope: ReportScope;
    month: number;
    year: number;
    hospital: string;
    generatedAt: string;
    patientDisplayName?: string;
    reportingLabel: string;
    section1: {
        totalPatientsTreated: {
            adult: number;
            pediatric: number;
        };
        newPatientsTreated: {
            adult: number;
            pediatric: number;
        };
        waitTimeForAccessToCare: string;
        transitionalReferralsFromPediatric: number;
        qualityOfCare: {
            er: {
                quality: { total: number; pediatric: number; adult: number };
                subQuality: { total: number; pediatric: number; adult: number };
            };
            admission: {
                quality: { total: number; pediatric: number; adult: number };
                subQuality: { total: number; pediatric: number; adult: number };
            };
        };
    };
    section2: {
        supportedInHospital: {
            er: { pediatric: number; adult: number };
            afterAdmission: { pediatric: number; adult: number };
            total: { pediatric: number; adult: number };
        };
        referredToHematologistBeforeDischarge: {
            pediatric: string;
            adult: string;
        };
        painCrisisAnalgesicsWithin60Minutes: {
            pediatric: string;
            adult: string;
        };
        routineClinicalVisitSupportCount: {
            pediatric: number;
            adult: number;
        };
        supportDuringErOrAdmissionAdult: ProgramReportSupportCounts;
        supportAfterDischargeAllPatients: ProgramReportSupportCounts;
    };
    section3: {
        supportDuringRoutineClinicalVisitAllPatients: ProgramReportSupportCounts;
        notes: string;
    };
}

export interface CollateProgramReportInput {
    month: number;
    year: number;
    patientIds?: string[];
    hospital?: string;
}
