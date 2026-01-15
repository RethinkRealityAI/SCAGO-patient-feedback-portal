'use server';

import { db } from '@/lib/firebase';
import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    serverTimestamp,
    limit,
    startAfter,
} from 'firebase/firestore';
import {
    programReportSchema,
    ProgramReport,
} from '@/types/report';
import { getServerSession } from '@/lib/server-auth';

const REPORTS_COLLECTION = 'program_reports';

// Helper to get current user from server session
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

export async function createReport(data: ProgramReport) {
    try {
        const user = await getCurrentUser();

        // Remove id if present in data to allow auto-generation or use specific logic
        const { id, ...reportData } = data;

        // Validate
        const validatedData = programReportSchema.omit({ id: true, createdAt: true, updatedAt: true, createdBy: true }).parse(reportData);

        // Check for existing report for this hospital/month/year?
        // Optional: Enforce uniqueness or just allow multiples

        const docRef = doc(collection(db, REPORTS_COLLECTION));

        const finalData = {
            ...validatedData,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            createdBy: user.email,
        };

        // Recursive helper to remove undefined
        const cleanData = (obj: any): any => {
            if (Array.isArray(obj)) {
                return obj.map(v => cleanData(v));
            } else if (obj !== null && typeof obj === 'object') {
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

        await setDoc(docRef, cleanData(finalData));
        return { success: true, id: docRef.id };
    } catch (error) {
        console.error('Error creating report:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Failed to create report' };
    }
}

export async function updateReport(id: string, data: Partial<ProgramReport>) {
    try {
        const user = await getCurrentUser();

        const updateData = {
            ...data,
            updatedAt: serverTimestamp(),
            updatedBy: user.email,
        };

        // Recursive helper to remove undefined (simplified for update)
        const cleanData = (obj: any): any => {
            if (Array.isArray(obj)) {
                return obj.map(v => cleanData(v));
            } else if (obj !== null && typeof obj === 'object') {
                if (obj instanceof Date) return obj; // Preserve Dates (though timestamps usually used)
                // Special handling for FieldValues if needed, but here we assume simple data
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

        await updateDoc(doc(db, REPORTS_COLLECTION, id), cleanData(updateData));
        return { success: true };
    } catch (error) {
        console.error('Error updating report:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Failed to update report' };
    }
}

export async function getReport(id: string) {
    try {
        await getCurrentUser();

        const docSnap = await getDoc(doc(db, REPORTS_COLLECTION, id));
        if (docSnap.exists()) {
            const data = docSnap.data();

            // Helper to convert timestamps
            const convertDates = (obj: any): any => {
                if (!obj) return obj;
                if (typeof obj === 'object') {
                    // Check if it's a Firestore Timestamp-like object (seconds, nanoseconds) or has toDate
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
            };

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

export async function getReports(filters?: { hospital?: string; year?: number; pageSize?: number; lastDoc?: any }) {
    try {
        await getCurrentUser();

        const pageSize = filters?.pageSize || 20;
        let q = query(collection(db, REPORTS_COLLECTION), orderBy('createdAt', 'desc'), limit(pageSize));

        if (filters?.hospital) {
            q = query(q, where('hospital', '==', filters.hospital));
        }
        if (filters?.year) {
            q = query(q, where('year', '==', filters.year));
        }

        // This simple querying has limits (compound queries need indexes).
        // If sorting by createdAt, we can filter by equality on other fields if we have an index.
        // For now, assuming basic usage.

        if (filters?.lastDoc) {
            q = query(q, startAfter(filters.lastDoc));
        }

        const snapshot = await getDocs(q);
        const reports = snapshot.docs.map((doc) => {
            const data = doc.data();
            const convertDates = (obj: any): any => {
                if (!obj) return obj;
                if (typeof obj === 'object') {
                    if (typeof obj.toDate === 'function') return obj.toDate();
                    if (Array.isArray(obj)) return obj.map(convertDates);
                    const result: any = {};
                    for (const key in obj) result[key] = convertDates(obj[key]);
                    return result;
                }
                return obj;
            };

            return {
                id: doc.id,
                ...convertDates(data),
            } as ProgramReport;
        });

        const lastVisible = snapshot.docs[snapshot.docs.length - 1];
        return { success: true, data: reports, lastDoc: lastVisible, hasMore: reports.length === pageSize };
    } catch (error) {
        console.error('Error fetching reports:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch reports', data: [], hasMore: false };
    }
}

export async function deleteReport(id: string) {
    try {
        await getCurrentUser();
        await deleteDoc(doc(db, REPORTS_COLLECTION, id));
        return { success: true };
    } catch (error) {
        console.error('Error deleting report:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Failed to delete report' };
    }
}
