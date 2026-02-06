'use server';

import { getAdminFirestore } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import {
    programReportSchema,
    ProgramReport,
} from '@/types/report';
import { Patient, PatientInteraction } from '@/types/patient';
import { getServerSession } from '@/lib/server-auth';
import { Timestamp } from 'firebase-admin/firestore';

const REPORTS_COLLECTION = 'program_reports';
const PATIENTS_COLLECTION = 'patients';
const INTERACTIONS_COLLECTION = 'patient_interactions';

/**
 * Helper to get current user and enforce admin privileges.
 */
async function getCurrentUser() {
    const session = await getServerSession();
    if (!session) {
        throw new Error('Unauthorized: authentication required');
    }
    if (session.role !== 'admin' && session.role !== 'super-admin') {
        throw new Error('Unauthorized: admin access required');
    }
    return session;
}

// Helper to convert Firestore dates to JS Dates (Admin SDK version)
function convertDates(obj: any): any {
    if (!obj) return obj;
    if (typeof obj === 'object') {
        // Check if it's a Firestore Timestamp (has toDate)
        if (typeof obj.toDate === 'function') {
            return obj.toDate();
        }

        if (Array.isArray(obj)) {
            return obj.map(convertDates);
        }

        const result: any = {};
        for (const key in obj) {
            result[key] = convertDates(obj[key]);
        }
        return result;
    }
    return obj;
}

// Generic recursive helper to remove undefined values
const cleanData = (obj: any): any => {
    if (Array.isArray(obj)) {
        return obj.map(v => cleanData(v));
    } else if (obj !== null && typeof obj === 'object') {
        if (obj instanceof Date) return obj;
        return Object.keys(obj).reduce((acc, key) => {
            const value = cleanData(obj[key]);
            if (value !== undefined) {
                acc[key] = value;
            }
            return acc;
        }, {} as any);
    }
    return obj;
};

export async function createReport(data: ProgramReport) {
    try {
        const user = await getCurrentUser();
        const firestore = getAdminFirestore();

        // Remove id if present to allow auto-generation
        const { id, ...reportData } = data;

        // Validate
        const validatedData = programReportSchema.omit({ id: true, createdAt: true, updatedAt: true, createdBy: true }).parse(reportData);

        const docRef = firestore.collection(REPORTS_COLLECTION).doc();

        const finalData = {
            ...validatedData,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            createdBy: user.email,
        };

        await docRef.set(cleanData(finalData));
        return { success: true, id: docRef.id };
    } catch (error) {
        console.error('Error creating report:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Failed to create report' };
    }
}

export async function updateReport(id: string, data: Partial<ProgramReport>) {
    try {
        const user = await getCurrentUser();
        const firestore = getAdminFirestore();

        const updateData = {
            ...data,
            updatedAt: FieldValue.serverTimestamp(),
            updatedBy: user.email,
        };

        await firestore.collection(REPORTS_COLLECTION).doc(id).update(cleanData(updateData));
        return { success: true };
    } catch (error) {
        console.error('Error updating report:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Failed to update report' };
    }
}

export async function getReport(id: string) {
    try {
        await getCurrentUser();
        const firestore = getAdminFirestore();

        const docSnap = await firestore.collection(REPORTS_COLLECTION).doc(id).get();
        if (docSnap.exists) {
            const data = docSnap.data();
            return {
                success: true,
                data: {
                    id: docSnap.id,
                    ...convertDates(data),
                } as ProgramReport
            };
        }
        return { success: false, error: 'Report not found' };
    } catch (error) {
        console.error('Error fetching report:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch report' };
    }
}

export async function getReports(filters?: { hospital?: string; year?: number; pageSize?: number; lastDocId?: string }) {
    try {
        await getCurrentUser();
        const firestore = getAdminFirestore();

        const pageSize = filters?.pageSize || 20;
        let query = firestore.collection(REPORTS_COLLECTION).orderBy('createdAt', 'desc').limit(pageSize);

        if (filters?.hospital) {
            query = query.where('hospital', '==', filters.hospital);
        }
        if (filters?.year) {
            query = query.where('year', '==', filters.year);
        }

        if (filters?.lastDocId) {
            const lastDoc = await firestore.collection(REPORTS_COLLECTION).doc(filters.lastDocId).get();
            if (lastDoc.exists) {
                query = query.startAfter(lastDoc);
            }
        }

        const snapshot = await query.get();
        const reports = snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
                id: doc.id,
                ...convertDates(data),
            } as ProgramReport;
        });

        const lastVisible = snapshot.docs[snapshot.docs.length - 1];
        return {
            success: true,
            data: reports,
            lastDocId: lastVisible?.id,
            hasMore: reports.length === pageSize
        };
    } catch (error) {
        console.error('Error fetching reports:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch reports', data: [], hasMore: false };
    }
}

export async function deleteReport(id: string) {
    try {
        await getCurrentUser();
        const firestore = getAdminFirestore();
        await firestore.collection(REPORTS_COLLECTION).doc(id).delete();
        return { success: true };
    } catch (error) {
        console.error('Error deleting report:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Failed to delete report' };
    }
}

export async function getTrendReports(filters: {
    startDate?: Date;
    endDate?: Date;
    hospital?: string;
    region?: string;
    patientId?: string;
}) {
    try {
        await getCurrentUser();
        const firestore = getAdminFirestore();

        // 1. Fetch interactions within date range first
        let query = firestore.collection(INTERACTIONS_COLLECTION);

        if (filters.startDate) {
            query = query.where('date', '>=', Timestamp.fromDate(filters.startDate)) as any;
        }
        if (filters.endDate) {
            query = query.where('date', '<=', Timestamp.fromDate(filters.endDate)) as any;
        }
        if (filters.patientId && filters.patientId !== 'all') {
            query = query.where('patientId', '==', filters.patientId) as any;
        }

        // Limit to prevent memory issues with massive datasets
        const interactionsSnap = await query.limit(5000).get();
        const interactions: PatientInteraction[] = interactionsSnap.docs.map(doc => ({
            id: doc.id,
            ...convertDates(doc.data())
        } as PatientInteraction));

        if (interactions.length === 0) {
            return {
                success: true,
                data: {
                    summary: { totalInteractions: 0, uniquePatients: 0, topService: 'N/A' },
                    charts: { byType: [], supportBreakdown: [], trends: [], hospitalBreakdown: [] },
                    patientBreakdown: []
                }
            };
        }

        // 2. Fetch only the patients involved in these interactions
        const uniquePatientIds = Array.from(new Set(interactions.map(i => i.patientId)));
        const patientsMap = new Map<string, Patient>();

        // Firestore 'in' query limit is 30, so we fetch in batches
        for (let i = 0; i < uniquePatientIds.length; i += 30) {
            const batch = uniquePatientIds.slice(i, i + 30);
            const patientsSnap = await firestore.collection(PATIENTS_COLLECTION)
                .where('__name__', 'in', batch)
                .get();

            patientsSnap.docs.forEach(doc => {
                patientsMap.set(doc.id, { id: doc.id, ...convertDates(doc.data()) } as Patient);
            });
        }

        // 3. Filter interactions based on patient demographics and Aggregate
        const filteredInteractions = interactions.filter(interaction => {
            const patient = patientsMap.get(interaction.patientId);
            if (!patient) return false;

            if (filters.hospital && filters.hospital !== 'all' && patient.hospital !== filters.hospital) return false;
            if (filters.region && filters.region !== 'all' && patient.region !== filters.region) return false;

            return true;
        });

        const totalInteractions = filteredInteractions.length;
        const uniquePatients = new Set(filteredInteractions.map(i => i.patientId)).size;

        const interactionsByType: Record<string, number> = {};
        const supportTypeBreakdown: Record<string, number> = {};
        const hospitalBreakdown: Record<string, number> = {};
        const dailyInteractions: Record<string, number> = {};
        const patientStats: Record<string, { id: string, name: string, count: number, hospital: string }> = {};

        filteredInteractions.forEach(i => {
            const patient = patientsMap.get(i.patientId)!;

            // By Type
            interactionsByType[i.type] = (interactionsByType[i.type] || 0) + 1;

            // Support Types
            i.supportTypes.forEach(st => {
                supportTypeBreakdown[st] = (supportTypeBreakdown[st] || 0) + 1;
            });

            // Hospital
            hospitalBreakdown[patient.hospital] = (hospitalBreakdown[patient.hospital] || 0) + 1;

            // Trend (Daily)
            const dateStr = i.date.toISOString().split('T')[0];
            dailyInteractions[dateStr] = (dailyInteractions[dateStr] || 0) + 1;

            // Individual Patient Stats
            if (!patientStats[i.patientId]) {
                patientStats[i.patientId] = {
                    id: i.patientId,
                    name: patient.fullName,
                    count: 0,
                    hospital: patient.hospital
                };
            }
            patientStats[i.patientId].count++;
        });

        return {
            success: true,
            data: {
                summary: {
                    totalInteractions,
                    uniquePatients,
                    topService: Object.entries(supportTypeBreakdown).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'
                },
                charts: {
                    byType: Object.entries(interactionsByType).map(([name, value]) => ({ name, value })),
                    supportBreakdown: Object.entries(supportTypeBreakdown).map(([name, value]) => ({ name, value })),
                    trends: Object.entries(dailyInteractions).sort((a, b) => a[0].localeCompare(b[0])).map(([date, count]) => ({ date, count })),
                    hospitalBreakdown: Object.entries(hospitalBreakdown).map(([name, value]) => ({ name, value }))
                },
                patientBreakdown: Object.values(patientStats).sort((a, b) => b.count - a.count)
            }
        };
    } catch (error) {
        console.error('Error generating trend reports:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Failed to generate trend reports' };
    }
}
