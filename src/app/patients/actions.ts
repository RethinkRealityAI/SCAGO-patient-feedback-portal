'use server';

import { getAdminFirestore, getAdminStorage } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import {
    patientSchema,
    Patient,
    PatientInteraction,
    PatientDocument,
} from '@/types/patient';
import { getServerSession } from '@/lib/server-auth';
import { revalidatePath } from 'next/cache';
import { interactionSchema } from '@/types/patient';

// Collection References
const PATIENTS_COLLECTION = 'patients';
const INTERACTIONS_COLLECTION = 'patient_interactions';
const DOCUMENTS_COLLECTION = 'patient_documents';

/**
 * Helper to get current user and enforce admin privileges.
 * This runs on the server, so we use server-side auth utilities.
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
function convertDates(data: any): any {
    if (!data) return data;
    const result = { ...data };
    for (const key in result) {
        if (result[key] && typeof result[key].toDate === 'function') {
            result[key] = result[key].toDate();
        } else if (result[key] && typeof result[key] === 'object' && !Array.isArray(result[key])) {
            result[key] = convertDates(result[key]);
        }
    }
    return result;
}

// --- Patient Actions ---

export async function createPatient(data: Patient) {
    try {
        const user = await getCurrentUser();
        const firestore = getAdminFirestore();

        const validatedData = patientSchema.parse(data);
        const docRef = firestore.collection(PATIENTS_COLLECTION).doc();

        const patientData = {
            ...validatedData,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            createdBy: user.email,
        };

        // Remove undefined values
        Object.keys(patientData).forEach((key) => {
            if ((patientData as any)[key] === undefined) {
                delete (patientData as any)[key];
            }
        });

        await docRef.set(patientData);
        return { success: true, id: docRef.id };
    } catch (error) {
        console.error('Error creating patient:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Failed to create patient' };
    }
}

export async function updatePatient(id: string, data: Partial<Patient>) {
    try {
        const user = await getCurrentUser();
        const firestore = getAdminFirestore();

        const updateData = {
            ...data,
            updatedAt: FieldValue.serverTimestamp(),
            updatedBy: user.email,
        };

        // Remove undefined values
        Object.keys(updateData).forEach((key) => {
            if ((updateData as any)[key] === undefined) {
                delete (updateData as any)[key];
            }
        });

        await firestore.collection(PATIENTS_COLLECTION).doc(id).update(updateData);
        return { success: true };
    } catch (error) {
        console.error('Error updating patient:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Failed to update patient' };
    }
}

export async function getPatient(id: string) {
    try {
        await getCurrentUser();
        const firestore = getAdminFirestore();

        const docSnap = await firestore.collection(PATIENTS_COLLECTION).doc(id).get();
        if (docSnap.exists) {
            const data = docSnap.data();
            return {
                success: true,
                data: {
                    id: docSnap.id,
                    ...convertDates(data),
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
    lastDocId?: string;
}) {
    try {
        await getCurrentUser();
        const firestore = getAdminFirestore();

        const pageSize = filters?.pageSize || 50;
        let query = firestore.collection(PATIENTS_COLLECTION).orderBy('createdAt', 'desc').limit(pageSize);

        if (filters?.hospital) {
            query = query.where('hospital', '==', filters.hospital);
        }
        if (filters?.status) {
            query = query.where('caseStatus', '==', filters.status);
        }
        if (filters?.region) {
            query = query.where('region', '==', filters.region);
        }

        // Pagination support for Admin SDK (using doc ID if needed)
        if (filters?.lastDocId) {
            const lastDoc = await firestore.collection(PATIENTS_COLLECTION).doc(filters.lastDocId).get();
            if (lastDoc.exists) {
                query = query.startAfter(lastDoc);
            }
        }

        const snapshot = await query.get();
        const patients = snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
                id: doc.id,
                ...convertDates(data),
            } as Patient;
        });

        const lastVisible = snapshot.docs[snapshot.docs.length - 1];
        return {
            success: true,
            data: patients,
            lastDocId: lastVisible?.id,
            hasMore: patients.length === pageSize
        };
    } catch (error) {
        console.error('Error fetching patients:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch patients', data: [], hasMore: false };
    }
}

// --- Interaction Actions ---

export async function addInteraction(data: PatientInteraction) {
    try {
        const user = await getCurrentUser();
        const firestore = getAdminFirestore();

        // Validate and COERCE data (very important for dates in server actions)
        const validatedData = interactionSchema.parse(data);

        const interactionData = {
            patientId: validatedData.patientId,
            date: validatedData.date,
            type: validatedData.type,
            category: validatedData.category || 'General',
            supportTypes: validatedData.supportTypes || [],
            notes: validatedData.notes,
            outcome: validatedData.outcome || '',
            createdBy: user.email,
            createdAt: FieldValue.serverTimestamp(),
        };

        console.log(`Saving interaction for patient ${validatedData.patientId}`, interactionData);

        const docRef = await firestore.collection(INTERACTIONS_COLLECTION).add(interactionData);
        console.log(`Interaction saved with ID: ${docRef.id}`);

        // Update last interaction on patient record
        await firestore.collection(PATIENTS_COLLECTION).doc(validatedData.patientId).update({
            lastInteraction: {
                date: validatedData.date,
                type: validatedData.type,
                summary: validatedData.notes.substring(0, 100),
            },
            updatedAt: FieldValue.serverTimestamp(),
        });

        // Purge cache for the specific patient profile
        revalidatePath(`/patients/${validatedData.patientId}`);

        return { success: true };
    } catch (error) {
        console.error('Error adding interaction:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Failed to add interaction' };
    }
}

export async function getPatientInteractions(patientId: string) {
    try {
        await getCurrentUser();
        const firestore = getAdminFirestore();

        console.log(`Fetching interactions for patient: ${patientId}`);
        // Remove orderBy to avoid potential missing index errors during development/scaling
        // Sorting will be handled on the client side
        const snapshot = await firestore.collection(INTERACTIONS_COLLECTION)
            .where('patientId', '==', patientId)
            .get();

        console.log(`Found ${snapshot.size} interactions for patient: ${patientId}`);

        const interactions = snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
                id: doc.id,
                ...convertDates(data),
            } as PatientInteraction;
        });

        return { success: true, data: interactions };
    } catch (error) {
        console.error('Error fetching interactions:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch interactions', data: [] };
    }
}

export async function updateInteraction(id: string, data: Partial<PatientInteraction>) {
    try {
        await getCurrentUser();
        const firestore = getAdminFirestore();

        const interactionDoc = await firestore.collection(INTERACTIONS_COLLECTION).doc(id).get();
        if (!interactionDoc.exists) {
            throw new Error('Interaction not found');
        }
        const existingData = interactionDoc.data();
        const patientId = existingData?.patientId;

        const updateData = {
            ...data,
            updatedAt: FieldValue.serverTimestamp(),
        };

        console.log(`Updating interaction ${id}`, updateData);
        await firestore.collection(INTERACTIONS_COLLECTION).doc(id).update(updateData);

        if (patientId) {
            revalidatePath(`/patients/${patientId}`);
        }

        return { success: true };
    } catch (error) {
        console.error('Error updating interaction:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Failed to update interaction' };
    }
}

export async function deleteInteraction(id: string, patientId: string) {
    try {
        await getCurrentUser();
        const firestore = getAdminFirestore();

        console.log(`Deleting interaction ${id} for patient ${patientId}`);
        await firestore.collection(INTERACTIONS_COLLECTION).doc(id).delete();

        revalidatePath(`/patients/${patientId}`);
        return { success: true };
    } catch (error) {
        console.error('Error deleting interaction:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Failed to delete interaction' };
    }
}

// --- Document Actions ---

export async function uploadDocument(formData: FormData) {
    try {
        const user = await getCurrentUser();
        const firestore = getAdminFirestore();
        const bucket = getAdminStorage().bucket();

        const file = formData.get('file') as File;
        const patientId = formData.get('patientId') as string;
        const type = formData.get('type') as PatientDocument['type'];
        const name = formData.get('name') as string;

        if (!file || !patientId || !type) {
            return { success: false, error: 'Missing required fields' };
        }

        const fileName = `${Date.now()}-${file.name}`;
        const filePath = `patient-documents/${patientId}/${fileName}`;
        const fileRef = bucket.file(filePath);

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        await fileRef.save(buffer, {
            metadata: {
                contentType: file.type,
            },
        });

        // Make the file publicly accessible if needed, or get a signed URL
        // Here we get a public URL if the bucket allows, otherwise signed
        const [url] = await fileRef.getSignedUrl({
            action: 'read',
            expires: '03-01-2500', // Far future
        });

        const docData = {
            patientId,
            type,
            url,
            path: filePath,
            fileName: name || file.name,
            uploadedAt: FieldValue.serverTimestamp(),
            uploadedBy: user.email,
        };

        await firestore.collection(DOCUMENTS_COLLECTION).add(docData);

        return { success: true, url };
    } catch (error) {
        console.error('Error uploading document:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Failed to upload document' };
    }
}

export async function getPatientDocuments(patientId: string) {
    try {
        await getCurrentUser();
        const firestore = getAdminFirestore();

        const snapshot = await firestore.collection(DOCUMENTS_COLLECTION)
            .where('patientId', '==', patientId)
            .orderBy('uploadedAt', 'desc')
            .get();

        const documents = snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
                id: doc.id,
                ...convertDates(data),
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
        await getCurrentUser();
        const firestore = getAdminFirestore();
        const bucket = getAdminStorage().bucket();

        // Delete from Storage
        try {
            await bucket.file(path).delete();
        } catch (e) {
            console.warn('File already deleted in storage or path invalid');
        }

        // Delete from Firestore
        await firestore.collection(DOCUMENTS_COLLECTION).doc(docId).delete();

        return { success: true };
    } catch (error) {
        console.error('Error deleting document:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Failed to delete document' };
    }
}

export async function deletePatient(id: string) {
    try {
        await getCurrentUser();
        const firestore = getAdminFirestore();

        // Delete patient document
        await firestore.collection(PATIENTS_COLLECTION).doc(id).delete();

        // Note: Related interactions and documents should ideally be deleted as well
        // We can do this in the background or here if the list isn't too huge

        return { success: true };
    } catch (error) {
        console.error('Error deleting patient:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Failed to delete patient' };
    }
}

export async function searchPatients(searchTerm: string) {
    try {
        await getCurrentUser();
        const firestore = getAdminFirestore();

        const snapshot = await firestore.collection(PATIENTS_COLLECTION).get();
        const patients = snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
                id: doc.id,
                ...convertDates(data),
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
        const user = await getCurrentUser();
        const firestore = getAdminFirestore();

        const updateData = {
            ...updates,
            updatedAt: FieldValue.serverTimestamp(),
            updatedBy: user.email,
        };

        // Remove undefined values
        Object.keys(updateData).forEach((key) => {
            if ((updateData as any)[key] === undefined) {
                delete (updateData as any)[key];
            }
        });

        const batch = firestore.batch();
        patientIds.forEach(id => {
            const ref = firestore.collection(PATIENTS_COLLECTION).doc(id);
            batch.update(ref, updateData);
        });

        await batch.commit();
        return { success: true, count: patientIds.length };
    } catch (error) {
        console.error('Error bulk updating patients:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Failed to bulk update patients' };
    }
}

export async function bulkDeletePatients(patientIds: string[]) {
    try {
        await getCurrentUser();
        const firestore = getAdminFirestore();

        const batch = firestore.batch();
        patientIds.forEach(id => {
            const ref = firestore.collection(PATIENTS_COLLECTION).doc(id);
            batch.delete(ref);
        });

        await batch.commit();
        return { success: true, count: patientIds.length };
    } catch (error) {
        console.error('Error bulk deleting patients:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Failed to bulk delete patients' };
    }
}

// --- Export Actions ---

export async function exportPatientsToCSV(patientIds?: string[]) {
    try {
        await getCurrentUser();
        let patients: Patient[];

        if (patientIds && patientIds.length > 0) {
            const promises = patientIds.map(id => getPatient(id));
            const results = await Promise.all(promises);
            patients = results
                .filter(r => r.success && r.data)
                .map(r => r.data!) as Patient[];
        } else {
            const result = await getPatients({ pageSize: 1000 });
            if (!result.success || !result.data) {
                return { success: false, error: 'Failed to fetch patients' };
            }
            patients = result.data;
        }

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
