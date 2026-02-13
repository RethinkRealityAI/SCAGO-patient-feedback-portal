'use server';

import { getAdminFirestore, getAdminStorage } from '@/lib/firebase-admin';
import type { Firestore, QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { FieldValue } from 'firebase-admin/firestore';
import {
    patientSchema,
    Patient,
    PatientInteraction,
    PatientDocument,
} from '@/types/patient';
import { getRegions } from '@/app/admin/user-actions';
import { getServerSession, type ServerSession } from '@/lib/server-auth';
import { revalidatePath } from 'next/cache';
import { interactionSchema } from '@/types/patient';
import { fetchAllSubmissionsAdmin } from '@/lib/submission-utils';
import {
    normalizeCityValue,
    resolveRegionFromCityAsync,
    DEFAULT_CITY_TO_REGION,
    type CityToRegionMap,
} from '@/lib/city-to-region';
import { ontarioHospitals } from '@/lib/hospital-names';
import { ontarioCities } from '@/lib/location-data';
import { createHash } from 'crypto';
import type { RegionAccessPolicyMode } from '@/app/admin/user-actions';
import type { CollateProgramReportInput, ProgramReportData, ProgramReportSupportCounts } from '@/types/program-report';

// Collection References
const PATIENTS_COLLECTION = 'patients';
const INTERACTIONS_COLLECTION = 'patient_interactions';
const DOCUMENTS_COLLECTION = 'patient_documents';
const INTAKE_CONVERSIONS_COLLECTION = 'patient_intake_conversions';
const REGION_MAPPINGS_DOC = 'region_mappings';

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

/** Check if admin can access patient by region. Super-admin always; admin needs region in allowedRegions or Unknown. */
function canAccessPatientByRegion(
    patientRegion: string | undefined,
    allowedRegions: string[] | null,
    mode: RegionAccessPolicyMode = 'legacy'
): boolean {
    if (allowedRegions === null) return true;
    if (!patientRegion) return false;
    if (patientRegion === 'Unknown') return true;
    if (mode === 'strict' && allowedRegions.length === 0) return false;
    return allowedRegions.length === 0 || allowedRegions.includes(patientRegion);
}

function shouldApplyRegionScope(mode: RegionAccessPolicyMode, allowedRegions: string[]): boolean {
    return mode === 'strict' || allowedRegions.length > 0;
}

function matchesPatientFilters(
    patient: Patient,
    filters?: { hospital?: string; status?: string; region?: string }
): boolean {
    if (filters?.hospital && patient.hospital !== filters.hospital) return false;
    if (filters?.status && patient.caseStatus !== filters.status) return false;
    if (filters?.region && patient.region !== filters.region) return false;
    return true;
}

/**
 * Verify the current user can access the patient.
 * Super-admin: full access. Admin: patient region must be in allowedRegions or Unknown.
 * @throws Error if access denied
 */
async function assertPatientAccess(patientId: string, session: ServerSession): Promise<void> {
    const firestore = getAdminFirestore();
    const docSnap = await firestore.collection(PATIENTS_COLLECTION).doc(patientId).get();
    if (!docSnap.exists) throw new Error('Patient not found');

    if (session.role === 'super-admin') return;

    const data = docSnap.data();
    const { allowedRegions, mode } = await getAdminRegionAccess(session.email);
    const regionFilter = shouldApplyRegionScope(mode, allowedRegions) ? allowedRegions : null;
    const patientRegion = data?.region as string | undefined;
    if (!canAccessPatientByRegion(patientRegion, regionFilter, mode)) {
        throw new Error('Patient not found');
    }
}

/** For admin: filter patientIds to only those the user can access (region-based). */
async function filterToAccessiblePatientIds(
    firestore: Firestore,
    patientIds: string[],
    session: ServerSession
): Promise<string[]> {
    if (patientIds.length === 0) return [];
    if (session.role === 'super-admin') return patientIds;
    const { allowedRegions, mode } = await getAdminRegionAccess(session.email);
    const regionFilter = shouldApplyRegionScope(mode, allowedRegions) ? allowedRegions : null;
    const batchSize = 25;
    const allowed: string[] = [];
    for (let i = 0; i < patientIds.length; i += batchSize) {
        const batch = patientIds.slice(i, i + batchSize);
        const refs = batch.map(id => firestore.collection(PATIENTS_COLLECTION).doc(id));
        const snaps = await firestore.getAll(...refs);
        snaps.forEach((snap) => {
            if (!snap.exists) return;
            const region = snap.data()?.region as string | undefined;
            if (canAccessPatientByRegion(region, regionFilter, mode)) {
                allowed.push(snap.id);
            }
        });
    }
    return allowed;
}

// --- Patient Actions ---

export async function createPatient(data: Patient) {
    try {
        const user = await getCurrentUser();
        const firestore = getAdminFirestore();

        const validatedData = patientSchema.parse(data);

        // Normalize region against configured regions
        const configuredRegions = await getRegions();
        if (!configuredRegions.includes(validatedData.region)) {
            validatedData.region = 'Unknown';
        }

        const docRef = firestore.collection(PATIENTS_COLLECTION).doc();

        const patientData = {
            ...validatedData,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            createdBy: user.email,
            createdByUid: user.uid,
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
        await assertPatientAccess(id, user);
        const firestore = getAdminFirestore();
        const safeData: Partial<Patient> = { ...data };
        delete safeData.createdBy;
        delete safeData.createdByUid;
        delete safeData.createdAt;
        delete safeData.id;

        // Normalize region against configured regions if being updated
        if (safeData.region) {
            const configuredRegions = await getRegions();
            if (!configuredRegions.includes(safeData.region)) {
                safeData.region = 'Unknown';
            }
        }

        const updateData = {
            ...safeData,
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
        const user = await getCurrentUser();
        const firestore = getAdminFirestore();

        const docSnap = await firestore.collection(PATIENTS_COLLECTION).doc(id).get();
        if (!docSnap.exists) {
            return { success: false, error: 'Patient not found' };
        }

        const data = docSnap.data();
        if (user.role === 'admin') {
            const { allowedRegions, mode } = await getAdminRegionAccess(user.email);
            const regionFilter = shouldApplyRegionScope(mode, allowedRegions) ? allowedRegions : null;
            if (!canAccessPatientByRegion(data?.region as string | undefined, regionFilter, mode)) {
                return { success: false, error: 'Patient not found' };
            }
        }

        return {
            success: true,
            data: {
                id: docSnap.id,
                ...convertDates(data),
            } as Patient
        };
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
        const user = await getCurrentUser();
        const firestore = getAdminFirestore();
        const adminRegionAccess = user.role === 'admin' ? await getAdminRegionAccess(user.email) : null;
        const allowedRegions = adminRegionAccess?.allowedRegions || [];
        const mode = adminRegionAccess?.mode || 'legacy';

        const pageSize = filters?.pageSize || 50;
        const isAdminOnly = user.role === 'admin';
        const hasRegionScope = isAdminOnly && shouldApplyRegionScope(mode, allowedRegions);
        const regionFilterValues = hasRegionScope ? Array.from(new Set([...allowedRegions, 'Unknown'])) : [];
        const hasLocalFilters = Boolean(filters?.hospital || filters?.status || filters?.region);
        const lastDoc = filters?.lastDocId
            ? await firestore.collection(PATIENTS_COLLECTION).doc(filters.lastDocId).get()
            : null;
        const startAfterDoc = lastDoc?.exists ? lastDoc : undefined;

        const chunkSize = hasRegionScope ? pageSize * 2 : pageSize;
        const byRegion = (p: Patient) => canAccessPatientByRegion(p.region, hasRegionScope ? allowedRegions : null, mode);
        // Track document snapshots alongside filtered results so the cursor
        // stays aligned with the last item actually returned to the caller.
        const collected: Array<{ patient: Patient; snap: QueryDocumentSnapshot }> = [];
        let cursor = startAfterDoc;
        let hasMore = false;
        let attempts = 0;
        const maxAttempts = hasRegionScope && hasLocalFilters ? 12 : 1;

        while (attempts < maxAttempts && collected.length < pageSize) {
            let query = firestore.collection(PATIENTS_COLLECTION)
                .orderBy('createdAt', 'desc')
                .limit(chunkSize);

            if (hasRegionScope && regionFilterValues.length > 0) {
                query = query.where('region', 'in', regionFilterValues) as ReturnType<typeof query.where>;
            }
            if (filters?.hospital && !hasRegionScope) {
                query = query.where('hospital', '==', filters.hospital);
            }
            if (filters?.status && !hasRegionScope) {
                query = query.where('caseStatus', '==', filters.status);
            }
            if (filters?.region && !hasRegionScope) {
                query = query.where('region', '==', filters.region);
            }
            if (cursor) {
                query = query.startAfter(cursor);
            }

            const snapshot = await query.get();
            if (snapshot.empty) {
                hasMore = false;
                break;
            }

            for (const doc of snapshot.docs) {
                const p = { id: doc.id, ...convertDates(doc.data()) } as Patient;
                if (!byRegion(p)) continue;
                if (hasLocalFilters && !matchesPatientFilters(p, filters)) continue;
                collected.push({ patient: p, snap: doc });
            }

            cursor = snapshot.docs[snapshot.docs.length - 1];
            hasMore = snapshot.docs.length === chunkSize;
            attempts += 1;

            if (!hasMore) break;
        }

        // Slice to pageSize and derive cursor from the last *returned* item
        const page = collected.slice(0, pageSize);
        const lastReturned = page[page.length - 1];
        const finalHasMore = hasMore || collected.length > pageSize;

        return {
            success: true,
            data: page.map(item => item.patient),
            lastDocId: lastReturned?.snap.id,
            hasMore: finalHasMore,
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
        // Validate and COERCE data (very important for dates in server actions)
        const validatedData = interactionSchema.parse(data);
        await assertPatientAccess(validatedData.patientId, user);
        const firestore = getAdminFirestore();

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
        const user = await getCurrentUser();
        await assertPatientAccess(patientId, user);
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
        const user = await getCurrentUser();
        const firestore = getAdminFirestore();

        const interactionDoc = await firestore.collection(INTERACTIONS_COLLECTION).doc(id).get();
        if (!interactionDoc.exists) {
            throw new Error('Interaction not found');
        }
        const existingData = interactionDoc.data();
        const patientId = existingData?.patientId as string | undefined;
        if (!patientId) {
            throw new Error('Interaction is missing patient association');
        }
        await assertPatientAccess(patientId, user);

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
        const user = await getCurrentUser();
        const firestore = getAdminFirestore();
        const interactionDoc = await firestore.collection(INTERACTIONS_COLLECTION).doc(id).get();
        if (!interactionDoc.exists) {
            return { success: false, error: 'Interaction not found' };
        }

        const storedPatientId = interactionDoc.data()?.patientId as string | undefined;
        if (!storedPatientId) {
            return { success: false, error: 'Interaction is missing patient association' };
        }
        if (patientId && storedPatientId !== patientId) {
            return { success: false, error: 'Interaction does not belong to the specified patient' };
        }
        await assertPatientAccess(storedPatientId, user);

        console.log(`Deleting interaction ${id} for patient ${storedPatientId}`);
        await firestore.collection(INTERACTIONS_COLLECTION).doc(id).delete();

        revalidatePath(`/patients/${storedPatientId}`);
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
        const patientId = formData.get('patientId') as string;
        if (!patientId) {
            return { success: false, error: 'Missing required fields' };
        }
        await assertPatientAccess(patientId, user);
        const firestore = getAdminFirestore();
        const bucket = getAdminStorage().bucket();

        const file = formData.get('file') as File;
        const type = formData.get('type') as PatientDocument['type'];
        const name = formData.get('name') as string;

        if (!file || !type) {
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
        const user = await getCurrentUser();
        await assertPatientAccess(patientId, user);
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
        const user = await getCurrentUser();
        const firestore = getAdminFirestore();
        const bucket = getAdminStorage().bucket();
        const docSnap = await firestore.collection(DOCUMENTS_COLLECTION).doc(docId).get();
        if (!docSnap.exists) {
            return { success: false, error: 'Document not found' };
        }

        const docData = docSnap.data();
        const storedPatientId = docData?.patientId as string | undefined;
        const storedPath = docData?.path as string | undefined;
        if (!storedPatientId || !storedPath) {
            return { success: false, error: 'Document record is invalid' };
        }
        if (patientId && storedPatientId !== patientId) {
            return { success: false, error: 'Document does not belong to the specified patient' };
        }
        if (path && storedPath !== path) {
            return { success: false, error: 'Document path mismatch' };
        }
        await assertPatientAccess(storedPatientId, user);

        // Delete from Storage
        try {
            await bucket.file(storedPath).delete();
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
        const user = await getCurrentUser();
        await assertPatientAccess(id, user);
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
        const user = await getCurrentUser();
        const firestore = getAdminFirestore();
        const adminRegionAccess = user.role === 'admin' ? await getAdminRegionAccess(user.email) : null;
        const allowedRegions = adminRegionAccess?.allowedRegions || [];
        const mode = adminRegionAccess?.mode || 'legacy';
        const hasRegionScope = user.role === 'admin' && shouldApplyRegionScope(mode, allowedRegions);
        const regionFilterValues = hasRegionScope ? Array.from(new Set([...allowedRegions, 'Unknown'])) : [];

        let query = firestore.collection(PATIENTS_COLLECTION);
        if (hasRegionScope && regionFilterValues.length > 0) {
            query = query.where('region', 'in', regionFilterValues) as typeof query;
        }
        const snapshot = await query.get();

        const byRegion = (p: Patient) => canAccessPatientByRegion(p.region, hasRegionScope ? allowedRegions : null, mode);
        const patients = snapshot.docs
            .map((doc) => ({ id: doc.id, ...convertDates(doc.data()) } as Patient))
            .filter(byRegion);

        const searchLower = searchTerm.toLowerCase();
        const filtered = patients.filter(p =>
            p.fullName.toLowerCase().includes(searchLower) ||
            (p.hospital?.toLowerCase() ?? '').includes(searchLower) ||
            (p.mrn?.toLowerCase() ?? '').includes(searchLower)
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

        const allowedIds = await filterToAccessiblePatientIds(firestore, patientIds, user);

        if (allowedIds.length === 0) {
            return { success: true, count: 0 };
        }

        const safeUpdates: Partial<Patient> = { ...updates };
        delete safeUpdates.createdBy;
        delete safeUpdates.createdByUid;
        delete safeUpdates.createdAt;
        delete safeUpdates.id;

        const updateData = {
            ...safeUpdates,
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
        allowedIds.forEach(id => {
            const ref = firestore.collection(PATIENTS_COLLECTION).doc(id);
            batch.update(ref, updateData);
        });

        await batch.commit();
        return { success: true, count: allowedIds.length };
    } catch (error) {
        console.error('Error bulk updating patients:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Failed to bulk update patients' };
    }
}

export async function bulkDeletePatients(patientIds: string[]) {
    try {
        const user = await getCurrentUser();
        const firestore = getAdminFirestore();

        const allowedIds = await filterToAccessiblePatientIds(firestore, patientIds, user);

        if (allowedIds.length === 0) {
            return { success: true, count: 0 };
        }

        const batch = firestore.batch();
        allowedIds.forEach(id => {
            const ref = firestore.collection(PATIENTS_COLLECTION).doc(id);
            batch.delete(ref);
        });

        await batch.commit();
        return { success: true, count: allowedIds.length };
    } catch (error) {
        console.error('Error bulk deleting patients:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Failed to bulk delete patients' };
    }
}

// --- Consent Candidate Actions ---

export interface ConsentCandidate {
    id: string;
    surveyId: string;
    submissionId: string;
    fullName: string;
    email: string;
    phone: string;
    city: string;
    region: Patient['region'];
    primaryHospital: string;
    signatureDate?: string;
    submittedAt: Date;
    candidateKey: string;
    /** First file upload if any (for consent form) */
    consentFile?: { url: string; path: string; name: string };
}

function isConsentLikeSubmission(sub: any): boolean {
    return !!(sub.digitalSignature || sub.ageConfirmation || sub.scdConnection || sub.primaryHospital);
}

function extractHospitalLabel(value: unknown): string {
    if (value == null) return '';
    if (typeof value === 'string') return value.trim();
    if (typeof value === 'object' && value !== null && 'selection' in value) {
        const obj = value as { selection?: string; other?: string };
        if (obj.selection === 'other' && obj.other) return obj.other.trim();
        if (obj.selection) {
            const found = ontarioHospitals.find(h => h.value === obj.selection);
            return found ? found.label : obj.selection;
        }
    }
    return '';
}

function computeCandidateKey(sub: any): string {
    const first = (sub.firstName || sub.first_name || '').toString().trim().toLowerCase();
    const last = (sub.lastName || sub.last_name || '').toString().trim().toLowerCase();
    const name = `${first} ${last}`.trim() || 'unknown';
    const dob = sub.individual1DOB || sub.individual2DOB || sub.individual3DOB;
    if (dob) {
        const d = typeof dob === 'string' ? dob : (dob instanceof Date ? dob.toISOString().slice(0, 10) : '');
        return `${name}::${d}`;
    }
    const email = (sub.email || '').toString().trim().toLowerCase();
    return email ? `${name}::${email}` : `${name}::${sub.id}`;
}

function hashDocKey(value: string): string {
    return createHash('sha256').update(value).digest('hex');
}

function createEmptySupportCounts(): ProgramReportSupportCounts {
    return {
        advocacySupport: 0,
        infoAboutScagoServices: 0,
        referralToCommunityConnections: 0,
        psychosocialSupport: 0,
        employmentSupport: 0,
        immigrationOrLegalSupport: 0,
        connectionToFinancialSupportsBenefits: 0,
        socialPrescribingBasicNeeds: 0,
        other: 0,
    };
}

function getReportRange(month: number, year: number): { start: Date; end: Date; label: string } {
    const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const end = new Date(year, month, 1, 0, 0, 0, 0);
    const label = `${start.toLocaleString('default', { month: 'long' })} ${year}`;
    return { start, end, label };
}

function isDateInRange(value: unknown, start: Date, end: Date): boolean {
    if (!value) return false;
    const date = value instanceof Date ? value : new Date(value as any);
    const time = date.getTime();
    if (Number.isNaN(time)) return false;
    return time >= start.getTime() && time < end.getTime();
}

function isAdultPatient(patient: Patient, referenceDate: Date): boolean {
    if (patient.dateOfBirth) {
        const dob = new Date(patient.dateOfBirth);
        if (!Number.isNaN(dob.getTime())) {
            const years = (referenceDate.getTime() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
            return years >= 18;
        }
    }
    return patient.clinicType === 'adult';
}

function normalizeSupportType(type: string): keyof ProgramReportSupportCounts {
    const normalized = type.toLowerCase().trim();
    if (normalized.includes('advocacy')) return 'advocacySupport';
    if (normalized.includes('info about scago')) return 'infoAboutScagoServices';
    if (normalized.includes('community connection') || normalized.includes('community referral')) return 'referralToCommunityConnections';
    if (normalized.includes('psychosocial')) return 'psychosocialSupport';
    if (normalized.includes('employment')) return 'employmentSupport';
    if (normalized.includes('immigration') || normalized.includes('legal')) return 'immigrationOrLegalSupport';
    if (normalized.includes('financial supports') || normalized.includes('financial support') || normalized.includes('benefits')) return 'connectionToFinancialSupportsBenefits';
    if (normalized.includes('social prescribing')) return 'socialPrescribingBasicNeeds';
    return 'other';
}

function incrementSupportCounts(
    target: ProgramReportSupportCounts,
    supportTypes: string[] | undefined
): void {
    for (const supportType of supportTypes || []) {
        target[normalizeSupportType(supportType)] += 1;
    }
}

function classifyInteraction(interaction: PatientInteraction): {
    isEr: boolean;
    isAdmission: boolean;
    isRoutine: boolean;
    isAfterDischarge: boolean;
} {
    const type = (interaction.type || '').toLowerCase();
    const category = (interaction.category || '').toLowerCase();
    const notes = (interaction.notes || '').toLowerCase();
    const outcome = (interaction.outcome || '').toLowerCase();

    const isEr =
        type === 'er_visit' ||
        category.includes('er') ||
        category.includes('ed') ||
        category.includes('emergency');
    const isAdmission =
        type === 'inpatient_support' ||
        type === 'admission_support' ||
        category.includes('inpatient') ||
        category.includes('admission');
    const isRoutine =
        type === 'routine_clinic_visit' ||
        category.includes('routine') ||
        category.includes('hemoglobinopathy clinic');
    const isAfterDischarge =
        type === 'follow_up' ||
        category.includes('discharge') ||
        notes.includes('discharge') ||
        outcome.includes('discharge');

    return { isEr, isAdmission, isRoutine, isAfterDischarge };
}

async function fetchInteractionsForPatientIds(
    firestore: Firestore,
    patientIds: string[]
): Promise<PatientInteraction[]> {
    if (patientIds.length === 0) return [];
    const unique = Array.from(new Set(patientIds));
    const batchSize = 10; // Firestore "in" clause limit
    const interactions: PatientInteraction[] = [];

    for (let i = 0; i < unique.length; i += batchSize) {
        const idsBatch = unique.slice(i, i + batchSize);
        try {
            const snapshot = await firestore
                .collection(INTERACTIONS_COLLECTION)
                .where('patientId', 'in', idsBatch)
                .get();
            interactions.push(
                ...snapshot.docs.map((doc) => ({ id: doc.id, ...convertDates(doc.data()) } as PatientInteraction))
            );
        } catch (error) {
            // Fallback path when "in" query limitations or index constraints occur.
            for (const patientId of idsBatch) {
                const snapshot = await firestore
                    .collection(INTERACTIONS_COLLECTION)
                    .where('patientId', '==', patientId)
                    .get();
                interactions.push(
                    ...snapshot.docs.map((doc) => ({ id: doc.id, ...convertDates(doc.data()) } as PatientInteraction))
                );
            }
        }
    }

    return interactions;
}

async function getRegionMappingsForResolution(firestore: Firestore): Promise<CityToRegionMap> {
    try {
        const regions = await getRegions();
        const validRegions = new Set<string>(regions.filter((r) => r !== 'Unknown'));
        const snap = await firestore.collection('config').doc(REGION_MAPPINGS_DOC).get();
        if (!snap.exists) return { ...DEFAULT_CITY_TO_REGION };
        const rawMappings = (snap.data() as any)?.mappings || {};
        const normalizedEntries = Object.entries(rawMappings).flatMap(([rawCity, rawRegion]) => {
            const city = rawCity.toString().trim().toLowerCase();
            const region = (typeof rawRegion === 'string' ? rawRegion : '').trim();
            if (!city || city === 'other') return [];
            if (!validRegions.has(region)) return [];
            return [[city, region] as const];
        });
        const sanitized = Object.fromEntries(normalizedEntries) as CityToRegionMap;
        return Object.keys(sanitized).length > 0 ? sanitized : { ...DEFAULT_CITY_TO_REGION };
    } catch {
        return { ...DEFAULT_CITY_TO_REGION };
    }
}

function extractConsentFile(sub: any): { url: string; path: string; name: string } | undefined {
    for (const fieldKey of Object.keys(sub || {})) {
        const val = sub[fieldKey];
        if (Array.isArray(val) && val.length > 0 && val[0]?.url) {
            return { url: val[0].url, path: val[0].path || '', name: val[0].name || 'consent' };
        }
    }
    return undefined;
}

async function buildConsentCandidateFromSubmission(
    sub: any,
    regionMappings?: CityToRegionMap
): Promise<ConsentCandidate> {
    const key = computeCandidateKey(sub);
    const firstName = (sub.firstName || sub.first_name || '').toString().trim();
    const lastName = (sub.lastName || sub.last_name || '').toString().trim();
    const fullName = `${firstName} ${lastName}`.trim() || 'Unknown';
    const city = normalizeCityValue(sub.city);
    const cityDisplay = typeof sub.city === 'object' && sub.city?.selection
        ? (ontarioCities.find(c => c.value === sub.city.selection)?.label || (sub.city.selection === 'other' && sub.city.other ? sub.city.other : sub.city.selection))
        : (typeof sub.city === 'string' ? sub.city : '');
    const region = await resolveRegionFromCityAsync(sub.city, regionMappings);
    const sigDate = sub.signatureDate;
    const submittedAt = sub.submittedAt instanceof Date ? sub.submittedAt : (sub.submittedAt?.toDate?.() || new Date(sub.submittedAt));

    return {
        id: sub.id,
        surveyId: sub.surveyId || '',
        submissionId: sub.id,
        fullName,
        email: (sub.email || '').toString().trim(),
        phone: (sub.phone || '').toString().trim(),
        city: cityDisplay || city || '',
        region,
        primaryHospital: extractHospitalLabel(sub.primaryHospital),
        signatureDate: typeof sigDate === 'string' ? sigDate : (sigDate instanceof Date ? sigDate.toISOString().slice(0, 10) : undefined),
        submittedAt,
        candidateKey: key,
        consentFile: extractConsentFile(sub),
    };
}

async function getAdminRegionAccess(email: string): Promise<{ allowedRegions: string[]; mode: RegionAccessPolicyMode }> {
    const firestore = getAdminFirestore();
    const snap = await firestore.collection('config').doc('page_permissions').get();
    if (!snap.exists) return { allowedRegions: [], mode: 'legacy' };
    const data = snap.data() as any;
    const regionsByEmail = data?.regionsByEmail || {};
    const mode = data?.regionAccessPolicy?.mode === 'strict' ? 'strict' : 'legacy';
    return { allowedRegions: regionsByEmail[email.toLowerCase()] || [], mode };
}

/**
 * Check if the current user would lose access to a patient if its region is changed to newRegion.
 * Used to show a confirmation modal before saving.
 */
export async function checkRegionChangeWarning(
    newRegion: string
): Promise<{ wouldLoseAccess: boolean }> {
    try {
        const user = await getCurrentUser();
        if (user.role === 'super-admin') return { wouldLoseAccess: false };
        const { allowedRegions, mode } = await getAdminRegionAccess(user.email);
        if (mode === 'legacy' && allowedRegions.length === 0) return { wouldLoseAccess: false };
        if (newRegion === 'Unknown') return { wouldLoseAccess: false };
        if (mode === 'strict' && allowedRegions.length === 0) return { wouldLoseAccess: true };
        return { wouldLoseAccess: !allowedRegions.includes(newRegion) };
    } catch {
        return { wouldLoseAccess: false };
    }
}

export async function getConsentCandidates(): Promise<{ success: boolean; data?: ConsentCandidate[]; error?: string }> {
    try {
        const user = await getCurrentUser();
        const firestore = getAdminFirestore();
        const adminRegionAccess = user.role === 'admin' ? await getAdminRegionAccess(user.email) : null;
        const allowedRegions = adminRegionAccess?.allowedRegions ?? null;
        const mode = adminRegionAccess?.mode ?? 'legacy';

        const allSubmissions = await fetchAllSubmissionsAdmin();
        const regionMappings = await getRegionMappingsForResolution(firestore);
        const consentSubs = allSubmissions.filter(s => isConsentLikeSubmission(s));

        const convertedKeys = new Set<string>();
        const convertedIds = new Set<string>();
        const patientsSnap = await firestore.collection(PATIENTS_COLLECTION).limit(2000).get();
        patientsSnap.docs.forEach(d => {
            const data = d.data();
            const dk = data.intakeCandidateKey;
            const sid = data.sourceSubmissionId;
            if (dk) convertedKeys.add(dk);
            if (sid) convertedIds.add(sid);
        });

        const keyToBest = new Map<string, ConsentCandidate>();
        for (const sub of consentSubs) {
            const key = computeCandidateKey(sub);
            if (convertedKeys.has(key) || convertedIds.has(sub.id)) continue;
            if (allowedRegions !== null && allowedRegions.length > 0) {
                const subRegion = await resolveRegionFromCityAsync(sub.city, regionMappings);
                const canSee = subRegion === 'Unknown' || allowedRegions.includes(subRegion);
                if (!canSee) continue;
            } else if (allowedRegions !== null && mode === 'strict') {
                const subRegion = await resolveRegionFromCityAsync(sub.city, regionMappings);
                if (subRegion !== 'Unknown') continue;
            }
            const candidate = await buildConsentCandidateFromSubmission(sub, regionMappings);

            const existing = keyToBest.get(key);
            if (!existing || candidate.submittedAt >= existing.submittedAt) {
                keyToBest.set(key, candidate);
            }
        }

        const data = Array.from(keyToBest.values()).sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
        return { success: true, data };
    } catch (error) {
        console.error('Error fetching consent candidates:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch candidates', data: [] };
    }
}

export async function createPatientFromCandidate(
    candidate: ConsentCandidate,
    overrides: Partial<Patient>
): Promise<{ success: true; id: string } | { success: false; error: string }> {
    try {
        const user = await getCurrentUser();
        const firestore = getAdminFirestore();
        const bucket = getAdminStorage().bucket();
        const submissionRef = firestore
            .collection('surveys')
            .doc(candidate.surveyId)
            .collection('submissions')
            .doc(candidate.submissionId);
        const submissionSnap = await submissionRef.get();
        if (!submissionSnap.exists) {
            return { success: false, error: 'Intake submission not found. Please refresh and try again.' };
        }
        const canonicalSubmission = { id: submissionSnap.id, surveyId: candidate.surveyId, ...submissionSnap.data() };
        if (!isConsentLikeSubmission(canonicalSubmission)) {
            return { success: false, error: 'Selected submission is not a valid consent/intake entry' };
        }
        const regionMappings = await getRegionMappingsForResolution(firestore);
        const canonicalCandidate = await buildConsentCandidateFromSubmission(canonicalSubmission, regionMappings);

        // Reject stale/tampered payloads from client; submission data is source of truth.
        if (candidate.candidateKey && candidate.candidateKey !== canonicalCandidate.candidateKey) {
            return { success: false, error: 'Intake data changed. Please refresh the intake list and try again.' };
        }

        const diagnosis = overrides.diagnosis || 'Sickle Cell Disease';
        const dob = overrides.dateOfBirth
            ? new Date(overrides.dateOfBirth)
            : new Date('2000-01-01');

        const hospital = overrides.hospital || canonicalCandidate.primaryHospital || 'To be confirmed';
        if (!hospital || hospital.length < 1) {
            return { success: false, error: 'Hospital is required' };
        }

        const region = overrides.region ?? canonicalCandidate.region;
        const regions = await getRegions();
        const validRegion = regions.includes(region) ? region : 'Unknown';

        const patientData = {
            ...overrides,
            fullName: overrides.fullName || canonicalCandidate.fullName,
            dateOfBirth: dob,
            hospital,
            region: validRegion,
            diagnosis,
            contactInfo: {
                email: overrides.contactInfo?.email ?? canonicalCandidate.email,
                phone: overrides.contactInfo?.phone ?? canonicalCandidate.phone,
                address: overrides.contactInfo?.address ?? '',
            },
            preferredCommunication: overrides.preferredCommunication ?? 'email',
            consentStatus: overrides.consentStatus ?? 'on_file',
            consentDate: canonicalCandidate.signatureDate ? new Date(canonicalCandidate.signatureDate) : new Date(),
            caseStatus: overrides.caseStatus ?? 'active',
            sourceSubmissionId: canonicalCandidate.submissionId,
            sourceSurveyId: canonicalCandidate.surveyId,
            intakeCandidateKey: canonicalCandidate.candidateKey,
            intakeCity: canonicalCandidate.city || undefined,
            intakeRegionResolution: canonicalCandidate.city || undefined,
        };

        const validatedData = patientSchema.parse(patientData);
        const docRef = firestore.collection(PATIENTS_COLLECTION).doc();
        const patientId = docRef.id;

        const toWrite = {
            ...validatedData,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            createdBy: user.email,
            createdByUid: user.uid,
        };
        Object.keys(toWrite).forEach((key) => {
            if ((toWrite as any)[key] === undefined) delete (toWrite as any)[key];
        });

        const intakeKeyLockRef = firestore
            .collection(INTAKE_CONVERSIONS_COLLECTION)
            .doc(`key_${hashDocKey(canonicalCandidate.candidateKey)}`);
        const intakeSubmissionLockRef = firestore
            .collection(INTAKE_CONVERSIONS_COLLECTION)
            .doc(`submission_${hashDocKey(canonicalCandidate.submissionId)}`);

        await firestore.runTransaction(async (tx) => {
            const [keyLockSnap, submissionLockSnap] = await Promise.all([
                tx.get(intakeKeyLockRef),
                tx.get(intakeSubmissionLockRef),
            ]);
            if (keyLockSnap.exists || submissionLockSnap.exists) {
                throw new Error('This intake has already been converted to a patient');
            }

            const [patientsWithKey, patientsWithSubmissionId] = await Promise.all([
                tx.get(
                    firestore.collection(PATIENTS_COLLECTION)
                        .where('intakeCandidateKey', '==', canonicalCandidate.candidateKey)
                        .limit(1)
                ),
                tx.get(
                    firestore.collection(PATIENTS_COLLECTION)
                        .where('sourceSubmissionId', '==', canonicalCandidate.submissionId)
                        .limit(1)
                ),
            ]);
            if (!patientsWithKey.empty || !patientsWithSubmissionId.empty) {
                throw new Error('This intake has already been converted to a patient');
            }

            tx.set(docRef, toWrite);
            tx.set(intakeKeyLockRef, {
                lockType: 'candidateKey',
                candidateKey: canonicalCandidate.candidateKey,
                submissionId: canonicalCandidate.submissionId,
                patientId,
                createdAt: FieldValue.serverTimestamp(),
                createdBy: user.email,
            });
            tx.set(intakeSubmissionLockRef, {
                lockType: 'submissionId',
                candidateKey: canonicalCandidate.candidateKey,
                submissionId: canonicalCandidate.submissionId,
                patientId,
                createdAt: FieldValue.serverTimestamp(),
                createdBy: user.email,
            });
        });

        if (canonicalCandidate.consentFile?.url) {
            try {
                const srcPath = canonicalCandidate.consentFile.path;
                const fileName = canonicalCandidate.consentFile.name || 'consent-form';
                const destPath = `patient-documents/${patientId}/${Date.now()}-${fileName}`;
                if (srcPath) {
                    const srcFile = bucket.file(srcPath);
                    const [buf] = await srcFile.download();
                    const destFile = bucket.file(destPath);
                    await destFile.save(buf, { metadata: { contentType: 'application/pdf' } });
                    const [signedUrl] = await destFile.getSignedUrl({ action: 'read', expires: '03-01-2500' });
                    await firestore.collection(DOCUMENTS_COLLECTION).add({
                        patientId,
                        type: 'consent_form',
                        url: signedUrl,
                        path: destPath,
                        fileName: fileName,
                        uploadedAt: FieldValue.serverTimestamp(),
                        uploadedBy: user.email,
                    });
                } else {
                    await firestore.collection(DOCUMENTS_COLLECTION).add({
                        patientId,
                        type: 'consent_form',
                        url: canonicalCandidate.consentFile.url,
                        path: `submission-ref:${canonicalCandidate.surveyId}/${canonicalCandidate.submissionId}`,
                        fileName: fileName,
                        uploadedAt: FieldValue.serverTimestamp(),
                        uploadedBy: user.email,
                    });
                }
            } catch (docErr) {
                console.warn('Could not attach consent document:', docErr);
            }
        } else {
            try {
                const { generateSubmissionPdf } = await import('@/lib/pdf-generator');
                const surveysSnap = await firestore.collection('surveys').doc(canonicalCandidate.surveyId).get();
                const surveyData = surveysSnap.exists ? surveysSnap.data() : null;
                const subData = submissionSnap.data() || {};
                const labels = surveyData ? await (await import('@/lib/pdf-generator')).extractFieldLabels(surveyData) : {};
                const order = surveyData ? await (await import('@/lib/pdf-generator')).extractFieldOrder(surveyData) : Object.keys(subData).filter(k => !['submittedAt', 'surveyId', 'sessionId'].includes(k));
                const orderedData: Record<string, any> = {};
                for (const k of order) {
                    if (subData[k] !== undefined) orderedData[k] = subData[k];
                }
                for (const [k, v] of Object.entries(subData)) {
                    if (!(k in orderedData)) orderedData[k] = v;
                }
                const pdfBuf = await generateSubmissionPdf({
                    title: `Consent - ${canonicalCandidate.fullName}`,
                    surveyId: canonicalCandidate.surveyId,
                    submittedAt: canonicalCandidate.submittedAt,
                    data: orderedData,
                    fieldLabels: labels,
                });
                if (pdfBuf) {
                    const destPath = `patient-documents/${patientId}/${Date.now()}-consent.pdf`;
                    const destFile = bucket.file(destPath);
                    await destFile.save(Buffer.from(pdfBuf), { metadata: { contentType: 'application/pdf' } });
                    const [signedUrl] = await destFile.getSignedUrl({ action: 'read', expires: '03-01-2500' });
                    await firestore.collection(DOCUMENTS_COLLECTION).add({
                        patientId,
                        type: 'consent_form',
                        url: signedUrl,
                        path: destPath,
                        fileName: 'consent-form.pdf',
                        uploadedAt: FieldValue.serverTimestamp(),
                        uploadedBy: user.email,
                    });
                }
            } catch (pdfErr) {
                console.warn('Could not generate consent PDF:', pdfErr);
            }
        }

        revalidatePath('/patients');
        revalidatePath('/patients/new');
        return { success: true, id: patientId };
    } catch (error) {
        console.error('Error creating patient from candidate:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Failed to create patient' };
    }
}

// --- Export Actions ---

export async function collateProgramReport(input: CollateProgramReportInput): Promise<{ success: boolean; data?: ProgramReportData; error?: string }> {
    try {
        const user = await getCurrentUser();
        const firestore = getAdminFirestore();

        if (!input.month || !input.year || input.month < 1 || input.month > 12) {
            return { success: false, error: 'Invalid reporting period' };
        }

        const { start, end, label } = getReportRange(input.month, input.year);
        const targetHospital = (input.hospital || '').trim();

        let patients: Patient[] = [];
        if (input.patientIds !== undefined) {
            if (input.patientIds.length === 0) {
                return { success: false, error: 'No patients available for this report scope.' };
            }
            const uniqueIds = Array.from(new Set(input.patientIds));
            const allowedIds = await filterToAccessiblePatientIds(firestore, uniqueIds, user);
            if (allowedIds.length === 0) {
                return { success: false, error: 'No accessible patients found for this report.' };
            }

            const refs = allowedIds.map((id) => firestore.collection(PATIENTS_COLLECTION).doc(id));
            const docs = await firestore.getAll(...refs);
            patients = docs
                .filter((doc) => doc.exists)
                .map((doc) => ({ id: doc.id, ...convertDates(doc.data()) } as Patient));
        } else {
            const res = await getPatients({ pageSize: 2000, hospital: targetHospital || undefined });
            if (!res.success || !res.data) {
                return { success: false, error: res.error || 'Failed to load patients' };
            }
            patients = res.data;
        }

        if (targetHospital) {
            patients = patients.filter((p) => (p.hospital || '').toLowerCase() === targetHospital.toLowerCase());
        }

        if (patients.length === 0) {
            return { success: false, error: 'No patients available for this report scope.' };
        }

        const patientIds = patients.map((p) => p.id).filter(Boolean) as string[];
        const interactions = await fetchInteractionsForPatientIds(firestore, patientIds);
        const interactionsInRange = interactions.filter((i) => isDateInRange(i.date, start, end));
        const patientMap = new Map(patients.map((p) => [p.id as string, p]));
        const patientEmailToAgeBucket = new Map<string, 'adult' | 'pediatric'>();

        let totalAdult = 0;
        let totalPediatric = 0;
        let newAdult = 0;
        let newPediatric = 0;

        for (const patient of patients) {
            const adult = isAdultPatient(patient, end);
            if (adult) totalAdult += 1;
            else totalPediatric += 1;

            if (patient.contactInfo?.email) {
                patientEmailToAgeBucket.set(patient.contactInfo.email.toLowerCase(), adult ? 'adult' : 'pediatric');
            }

            if (isDateInRange(patient.createdAt, start, end)) {
                if (adult) newAdult += 1;
                else newPediatric += 1;
            }
        }

        const erAdultSet = new Set<string>();
        const erPediatricSet = new Set<string>();
        const admissionAdultSet = new Set<string>();
        const admissionPediatricSet = new Set<string>();
        const routineAdultSet = new Set<string>();
        const routinePediatricSet = new Set<string>();

        const erOrAdmissionAdultSupport = createEmptySupportCounts();
        const afterDischargeSupport = createEmptySupportCounts();
        const routineSupportAll = createEmptySupportCounts();

        for (const interaction of interactionsInRange) {
            const patientId = interaction.patientId;
            const patient = patientMap.get(patientId);
            if (!patient) continue;
            const adult = isAdultPatient(patient, end);
            const { isEr, isAdmission, isRoutine, isAfterDischarge } = classifyInteraction(interaction);

            if (isEr) {
                if (adult) erAdultSet.add(patientId);
                else erPediatricSet.add(patientId);
            }
            if (isAdmission) {
                if (adult) admissionAdultSet.add(patientId);
                else admissionPediatricSet.add(patientId);
            }
            if (isRoutine) {
                if (adult) routineAdultSet.add(patientId);
                else routinePediatricSet.add(patientId);
                incrementSupportCounts(routineSupportAll, interaction.supportTypes);
            }
            if (adult && (isEr || isAdmission)) {
                incrementSupportCounts(erOrAdmissionAdultSupport, interaction.supportTypes);
            }
            if (isAfterDischarge) {
                incrementSupportCounts(afterDischargeSupport, interaction.supportTypes);
            }
        }

        const quality = {
            er: {
                quality: { total: 0, pediatric: 0, adult: 0 },
                subQuality: { total: 0, pediatric: 0, adult: 0 },
            },
            admission: {
                quality: { total: 0, pediatric: 0, adult: 0 },
                subQuality: { total: 0, pediatric: 0, adult: 0 },
            },
        };

        try {
            const submissions = await fetchAllSubmissionsAdmin();
            const relevantSubmissions = submissions.filter((s) => {
                if (!isDateInRange(s.submittedAt, start, end)) return false;
                if (!targetHospital) return true;
                const candidateHospital =
                    (s.hospital as string) ||
                    (s.hospitalName as string) ||
                    (s.primaryHospital as string) ||
                    (s['hospital-on'] as string) ||
                    '';
                return candidateHospital.toLowerCase() === targetHospital.toLowerCase();
            });

            for (const submission of relevantSubmissions) {
                const rating = Number(submission.rating ?? 0);
                if (!Number.isFinite(rating) || rating <= 0) continue;

                const dept = String((submission.department as string) || (submission.visitType as string) || '').toLowerCase();
                const inEr = dept.includes('er') || dept.includes('ed') || dept.includes('emergency');
                const inAdmission = dept.includes('inpatient') || dept.includes('admission') || dept.includes('ward');
                if (!inEr && !inAdmission) continue;

                const email = String((submission.email as string) || '').toLowerCase();
                const bucket = patientEmailToAgeBucket.get(email);

                const qualityBucket = rating >= 7 ? 'quality' : rating <= 4 ? 'subQuality' : null;
                if (!qualityBucket) continue;

                const section = inEr ? quality.er : quality.admission;
                section[qualityBucket].total += 1;
                if (bucket === 'adult') section[qualityBucket].adult += 1;
                if (bucket === 'pediatric') section[qualityBucket].pediatric += 1;
            }
        } catch (error) {
            console.warn('Failed to enrich report with feedback quality data:', error);
        }

        const reportData: ProgramReportData = {
            scope: patientIds.length === 1 ? 'single' : 'roster',
            month: input.month,
            year: input.year,
            hospital: targetHospital || 'All Hospitals',
            generatedAt: new Date().toISOString(),
            patientDisplayName: patientIds.length === 1 ? patients[0]?.fullName : undefined,
            reportingLabel: label,
            section1: {
                totalPatientsTreated: {
                    adult: totalAdult,
                    pediatric: totalPediatric,
                },
                newPatientsTreated: {
                    adult: newAdult,
                    pediatric: newPediatric,
                },
                waitTimeForAccessToCare: 'Not provided',
                transitionalReferralsFromPediatric: 0,
                qualityOfCare: quality,
            },
            section2: {
                supportedInHospital: {
                    er: {
                        pediatric: erPediatricSet.size,
                        adult: erAdultSet.size,
                    },
                    afterAdmission: {
                        pediatric: admissionPediatricSet.size,
                        adult: admissionAdultSet.size,
                    },
                    total: {
                        pediatric: new Set([...erPediatricSet, ...admissionPediatricSet]).size,
                        adult: new Set([...erAdultSet, ...admissionAdultSet]).size,
                    },
                },
                referredToHematologistBeforeDischarge: {
                    pediatric: 'unknown',
                    adult: 'unknown',
                },
                painCrisisAnalgesicsWithin60Minutes: {
                    pediatric: 'unknown',
                    adult: 'unknown',
                },
                routineClinicalVisitSupportCount: {
                    pediatric: routinePediatricSet.size,
                    adult: routineAdultSet.size,
                },
                supportDuringErOrAdmissionAdult: erOrAdmissionAdultSupport,
                supportAfterDischargeAllPatients: afterDischargeSupport,
            },
            section3: {
                supportDuringRoutineClinicalVisitAllPatients: routineSupportAll,
                notes:
                    'Autogenerated draft. Metrics without structured source data are set to "unknown" or defaults and should be reviewed before export.',
            },
        };

        return { success: true, data: reportData };
    } catch (error) {
        console.error('Error collating program report:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Failed to collate report data' };
    }
}

export async function exportProgramReportPdf(reportData: ProgramReportData): Promise<{ error?: string; pdfBase64?: string }> {
    try {
        await getCurrentUser();
        const { generateProgramReportPdf } = await import('@/lib/program-report-pdf');
        const pdfBytes = await generateProgramReportPdf(reportData);
        if (!pdfBytes) return { error: 'Failed to generate PDF' };
        return { pdfBase64: Buffer.from(pdfBytes).toString('base64') };
    } catch (error) {
        console.error('Error exporting program report PDF:', error);
        return { error: 'Failed to generate PDF' };
    }
}

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
