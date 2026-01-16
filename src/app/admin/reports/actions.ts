'use server';

import { getAdminFirestore } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import {
    programReportSchema,
    ProgramReport,
} from '@/types/report';
import { getServerSession } from '@/lib/server-auth';

const REPORTS_COLLECTION = 'program_reports';

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
