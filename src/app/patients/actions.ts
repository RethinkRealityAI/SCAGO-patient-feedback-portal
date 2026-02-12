'use server';

import { getAdminFirestore, getAdminStorage } from '@/lib/firebase-admin';
import type { Firestore, QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { FieldValue } from 'firebase-admin/firestore';
import {
    patientSchema,
    Patient,
    PatientInteraction,
    PatientDocument,
    REGIONS,
} from '@/types/patient';
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

async function getRegionMappingsForResolution(firestore: Firestore): Promise<CityToRegionMap> {
    try {
        const snap = await firestore.collection('config').doc(REGION_MAPPINGS_DOC).get();
        if (!snap.exists) return { ...DEFAULT_CITY_TO_REGION };
        const rawMappings = (snap.data() as any)?.mappings || {};
        const validRegions = new Set<string>(REGIONS.filter((region) => region !== 'Unknown'));
        const normalizedEntries = Object.entries(rawMappings).flatMap(([rawCity, rawRegion]) => {
            const city = rawCity.toString().trim().toLowerCase();
            const region = rawRegion as Patient['region'];
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
        const validRegion = REGIONS.includes(region) ? region : 'Unknown';

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
