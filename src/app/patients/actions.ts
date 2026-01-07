'use server';

import { db, storage } from '@/lib/firebase';
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
    addDoc,
    limit,
    startAfter,
    QueryDocumentSnapshot,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import {
    patientSchema,
    Patient,
    PatientInteraction,
    PatientDocument,
} from '@/types/patient';
import { getServerSession } from '@/lib/server-auth';

// Collection References
const PATIENTS_COLLECTION = 'patients';
const INTERACTIONS_COLLECTION = 'patient_interactions';
const DOCUMENTS_COLLECTION = 'patient_documents';

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

// --- Patient Actions ---

export async function createPatient(data: Patient) {
    try {
        // Auth check
        const user = await getCurrentUser();

        const validatedData = patientSchema.parse(data);
        const docRef = doc(collection(db, PATIENTS_COLLECTION));

        const patientData = {
            ...validatedData,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            createdBy: user.email,
        };

        // Remove undefined values
        Object.keys(patientData).forEach((key) => {
            if ((patientData as any)[key] === undefined) {
                delete (patientData as any)[key];
            }
        });

        await setDoc(docRef, patientData);
        return { success: true, id: docRef.id };
    } catch (error) {
        console.error('Error creating patient:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Failed to create patient' };
    }
}

export async function updatePatient(id: string, data: Partial<Patient>) {
    try {
        // Auth check
        const user = await getCurrentUser();

        const updateData = {
            ...data,
            updatedAt: serverTimestamp(),
            updatedBy: user.email,
        };

        // Remove undefined values
        Object.keys(updateData).forEach((key) => {
            if ((updateData as any)[key] === undefined) {
                delete (updateData as any)[key];
            }
        });

        await updateDoc(doc(db, PATIENTS_COLLECTION, id), updateData);
        return { success: true };
    } catch (error) {
        console.error('Error updating patient:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Failed to update patient' };
    }
}

export async function getPatient(id: string) {
    try {
        // Auth check
        await getCurrentUser();

        const docSnap = await getDoc(doc(db, PATIENTS_COLLECTION, id));
        if (docSnap.exists()) {
            const data = docSnap.data();
            return {
                success: true,
                data: {
                    id: docSnap.id,
                    ...data,
                    dateOfBirth: data.dateOfBirth?.toDate(),
                    consentDate: data.consentDate?.toDate(),
                    referral: data.referral ? {
                        ...data.referral,
                        date: data.referral.date?.toDate(),
                    } : undefined,
                    createdAt: data.createdAt?.toDate(),
                    updatedAt: data.updatedAt?.toDate(),
                } as Patient
            };
        }
        return { success: false, error: 'Patient not found' };
    } catch (error) {
        console.error('Error fetching patient:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch patient' };
    }
}

export async function getPatients(filters?: {
    hospital?: string;
    status?: string;
    region?: string;
    pageSize?: number;
    lastDoc?: any;
}) {
    try {
        // Auth check
        await getCurrentUser();

        const pageSize = filters?.pageSize || 50; // Default page size
        let q = query(collection(db, PATIENTS_COLLECTION), orderBy('createdAt', 'desc'), limit(pageSize));

        if (filters?.hospital) {
            q = query(q, where('hospital', '==', filters.hospital));
        }
        if (filters?.status) {
            q = query(q, where('caseStatus', '==', filters.status));
        }
        if (filters?.region) {
            q = query(q, where('region', '==', filters.region));
        }

        // Pagination support
        if (filters?.lastDoc) {
            q = query(q, startAfter(filters.lastDoc));
        }

        const snapshot = await getDocs(q);
        const patients = snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                dateOfBirth: data.dateOfBirth?.toDate(),
                consentDate: data.consentDate?.toDate(),
                referral: data.referral ? {
                    ...data.referral,
                    date: data.referral.date?.toDate(),
                } : undefined,
                createdAt: data.createdAt?.toDate(),
                updatedAt: data.updatedAt?.toDate(),
            } as Patient;
        });

        const lastVisible = snapshot.docs[snapshot.docs.length - 1];
        return { success: true, data: patients, lastDoc: lastVisible, hasMore: patients.length === pageSize };
    } catch (error) {
        console.error('Error fetching patients:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch patients', data: [], hasMore: false };
    }
}

// --- Interaction Actions ---

export async function addInteraction(data: PatientInteraction) {
    try {
        // Auth check
        const user = await getCurrentUser();

        const interactionData = {
            patientId: data.patientId,
            date: data.date,
            type: data.type,
            notes: data.notes,
            outcome: data.outcome || '',
            createdBy: user.email,
            createdAt: serverTimestamp(),
        };

        await addDoc(collection(db, INTERACTIONS_COLLECTION), interactionData);

        // Update last interaction on patient record
        await updateDoc(doc(db, PATIENTS_COLLECTION, data.patientId), {
            lastInteraction: {
                date: serverTimestamp(),
                type: data.type,
                summary: data.notes.substring(0, 100),
            },
            updatedAt: serverTimestamp(),
        });

        return { success: true };
    } catch (error) {
        console.error('Error adding interaction:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Failed to add interaction' };
    }
}

export async function getPatientInteractions(patientId: string) {
    try {
        // Auth check
        await getCurrentUser();

        const q = query(
            collection(db, INTERACTIONS_COLLECTION),
            where('patientId', '==', patientId),
            orderBy('date', 'desc')
        );

        const snapshot = await getDocs(q);
        const interactions = snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                date: data.date?.toDate(),
                createdAt: data.createdAt?.toDate(),
            } as PatientInteraction;
        });
        return { success: true, data: interactions };
    } catch (error) {
        console.error('Error fetching interactions:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch interactions', data: [] };
    }
}

// --- Document Actions ---

export async function uploadDocument(formData: FormData) {
    try {
        // Auth check
        const user = await getCurrentUser();

        const file = formData.get('file') as File;
        const patientId = formData.get('patientId') as string;
        const type = formData.get('type') as PatientDocument['type'];
        const name = formData.get('name') as string;

        if (!file || !patientId || !type) {
            return { success: false, error: 'Missing required fields' };
        }

        const storageRef = ref(storage, `patient-documents/${patientId}/${Date.now()}-${file.name}`);
        const snapshot = await uploadBytes(storageRef, file);
        const url = await getDownloadURL(snapshot.ref);
        const path = snapshot.ref.fullPath;

        const docData = {
            patientId,
            type,
            url,
            path,
            fileName: name || file.name,
            uploadedAt: serverTimestamp(),
            uploadedBy: user.email,
        };

        await addDoc(collection(db, DOCUMENTS_COLLECTION), docData);

        return { success: true, url };
    } catch (error) {
        console.error('Error uploading document:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Failed to upload document' };
    }
}

export async function getPatientDocuments(patientId: string) {
    try {
        // Auth check
        await getCurrentUser();

        const q = query(
            collection(db, DOCUMENTS_COLLECTION),
            where('patientId', '==', patientId),
            orderBy('uploadedAt', 'desc')
        );

        const snapshot = await getDocs(q);
        const documents = snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                uploadedAt: data.uploadedAt?.toDate(),
            } as PatientDocument;
        });
        return { success: true, data: documents };
    } catch (error) {
        console.error('Error fetching documents:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch documents', data: [] };
    }
}

export async function deleteDocument(patientId: string, docId: string, path: string) {
    try {
        // Auth check
        await getCurrentUser();

        // Delete from Storage
        const storageRef = ref(storage, path);
        await deleteObject(storageRef);

        // Delete from Firestore
        await deleteDoc(doc(db, DOCUMENTS_COLLECTION, docId));

        return { success: true };
    } catch (error) {
        console.error('Error deleting document:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Failed to delete document' };
    }
}

export async function deletePatient(id: string) {
    try {
        // Auth check
        await getCurrentUser();

        // Delete patient document
        await deleteDoc(doc(db, PATIENTS_COLLECTION, id));

        // TODO: Also delete related interactions and documents
        // This should be done in a transaction or cloud function

        return { success: true };
    } catch (error) {
        console.error('Error deleting patient:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Failed to delete patient' };
    }
}

export async function searchPatients(searchTerm: string) {
    try {
        // Auth check
        await getCurrentUser();

        // Note: Firestore doesn't support full-text search natively
        // This is a simple implementation that filters on the client side
        // For production, consider using Algolia or similar service

        const snapshot = await getDocs(collection(db, PATIENTS_COLLECTION));
        const patients = snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                dateOfBirth: data.dateOfBirth?.toDate(),
                consentDate: data.consentDate?.toDate(),
                referral: data.referral ? {
                    ...data.referral,
                    date: data.referral.date?.toDate(),
                } : undefined,
                createdAt: data.createdAt?.toDate(),
                updatedAt: data.updatedAt?.toDate(),
            } as Patient;
        });

        const filtered = patients.filter(p =>
            p.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.hospital.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.mrn?.toLowerCase().includes(searchTerm.toLowerCase())
        );

        return { success: true, data: filtered };
    } catch (error) {
        console.error('Error searching patients:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Failed to search patients', data: [] };
    }
}

// --- Bulk Actions ---

export async function bulkUpdatePatients(patientIds: string[], updates: Partial<Patient>) {
    try {
        // Auth check
        const user = await getCurrentUser();

        const updateData = {
            ...updates,
            updatedAt: serverTimestamp(),
            updatedBy: user.email,
        };

        // Remove undefined values
        Object.keys(updateData).forEach((key) => {
            if ((updateData as any)[key] === undefined) {
                delete (updateData as any)[key];
            }
        });

        // Update all patients
        const promises = patientIds.map(id =>
            updateDoc(doc(db, PATIENTS_COLLECTION, id), updateData)
        );

        await Promise.all(promises);

        return { success: true, count: patientIds.length };
    } catch (error) {
        console.error('Error bulk updating patients:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Failed to bulk update patients' };
    }
}

export async function bulkDeletePatients(patientIds: string[]) {
    try {
        // Auth check
        await getCurrentUser();

        // Delete all patients
        const promises = patientIds.map(id =>
            deleteDoc(doc(db, PATIENTS_COLLECTION, id))
        );

        await Promise.all(promises);

        // TODO: Also delete related interactions and documents
        // This should be done in a transaction or cloud function

        return { success: true, count: patientIds.length };
    } catch (error) {
        console.error('Error bulk deleting patients:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Failed to bulk delete patients' };
    }
}

// --- Export Actions ---

export async function exportPatientsToCSV(patientIds?: string[]) {
    try {
        // Auth check
        await getCurrentUser();

        let patients: Patient[];

        if (patientIds && patientIds.length > 0) {
            // Export specific patients
            const promises = patientIds.map(id => getPatient(id));
            const results = await Promise.all(promises);
            patients = results
                .filter(r => r.success && r.data)
                .map(r => r.data!) as Patient[];
        } else {
            // Export all patients
            const result = await getPatients();
            if (!result.success || !result.data) {
                return { success: false, error: 'Failed to fetch patients' };
            }
            patients = result.data;
        }

        // Convert to CSV
        const headers = [
            'ID', 'Full Name', 'Date of Birth', 'Hospital', 'Region',
            'MRN', 'Diagnosis', 'Case Status', 'Consent Status',
            'Created At', 'Updated At'
        ];

        const rows = patients.map(p => [
            p.id || '',
            p.fullName,
            p.dateOfBirth ? new Date(p.dateOfBirth).toLocaleDateString() : '',
            p.hospital,
            p.region,
            p.mrn || '',
            p.diagnosis,
            p.caseStatus,
            p.consentStatus,
            p.createdAt ? new Date(p.createdAt).toLocaleString() : '',
            p.updatedAt ? new Date(p.updatedAt).toLocaleString() : '',
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        return { success: true, data: csvContent };
    } catch (error) {
        console.error('Error exporting patients:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Failed to export patients' };
    }
}
