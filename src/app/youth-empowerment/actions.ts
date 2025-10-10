import { z } from 'zod';
import { db, storage } from '@/lib/firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  updateDoc,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
// import { revalidatePath } from 'next/cache'; // Removed - not compatible with client-side usage
import { hashSIN, extractSINLast4, validateSINLenient } from '@/lib/youth-empowerment';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

// Helper: parse a YYYY-MM-DD string into a local Date at noon to avoid UTC shifts
function parseLocalDateFromYMD(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map((v) => parseInt(v, 10));
  // Use noon local time to avoid DST/UTC cross-over shifting date by one day
  return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0, 0);
}

// Validation Schemas - Updated to handle empty data gracefully
const participantSchema = z.object({
  youthParticipant: z.string().min(2, 'Name is required'),
  age: z.number().min(16).max(30).optional(),
  email: z.string().email('Valid email is required').optional().or(z.literal('')),
  etransferEmailAddress: z.string().email('Valid email is required').optional().or(z.literal('')),
  phoneNumber: z.string().optional().or(z.literal('')),
  emergencyContactRelationship: z.string().optional().or(z.literal('')),
  emergencyContactNumber: z.string().optional().or(z.literal('')),
  region: z.string().optional().or(z.literal('')),
  mailingAddress: z.string().optional().or(z.literal('')),
  // Separate address fields
  streetAddress: z.string().optional().or(z.literal('')),
  city: z.string().optional().or(z.literal('')),
  province: z.string().optional().or(z.literal('')),
  postalCode: z.string().optional().or(z.literal('')),
  projectCategory: z.string().optional().or(z.literal('')),
  projectInANutshell: z.string().optional().or(z.literal('')),
  contractSigned: z.boolean().optional().default(false),
  signedSyllabus: z.boolean().optional().default(false),
  availability: z.string().optional().or(z.literal('')),
  assignedMentor: z.string().optional().or(z.literal('')),
  idProvided: z.boolean().optional().default(false),
  canadianStatus: z.enum(['Canadian Citizen', 'Permanent Resident', 'Other']).optional(),
  sin: z.string().optional().or(z.literal('')),
  sinNumber: z.string().optional().or(z.literal('')),
  youthProposal: z.string().optional().or(z.literal('')),
  affiliationWithSCD: z.string().optional().or(z.literal('')),
  proofOfAffiliationWithSCD: z.boolean().optional().default(false),
  scagoCounterpart: z.string().optional().or(z.literal('')),
  dob: z.string().optional().or(z.literal('')),
  file: z.string().optional().or(z.literal('')),
  fileUpload: z.instanceof(File).optional(),
  // Additional legacy fields
  approved: z.boolean().optional().default(false),
  canadianStatusOther: z.string().optional().or(z.literal('')),
  citizenshipStatus: z.string().optional().or(z.literal('')),
  location: z.string().optional().or(z.literal('')),
  duties: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
  nextSteps: z.string().optional().or(z.literal('')),
  interviewed: z.boolean().optional(),
  interviewNotes: z.string().optional().or(z.literal('')),
  recruited: z.boolean().optional(),
}).superRefine((data, ctx) => {
  if (data.canadianStatus === 'Other' && (!data.canadianStatusOther || data.canadianStatusOther.trim() === '')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Please specify your status when "Other" is selected',
      path: ['canadianStatusOther'],
    });
  }
});

const mentorSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  title: z.string().min(2, 'Title is required'),
  assignedStudents: z.array(z.string()).default([]),
});

const workshopSchema = z.object({
  title: z.string().min(3, 'Title is required'),
  description: z.string().optional(),
  date: z.string().min(1, 'Date is required'),
});

const attendanceSchema = z.object({
  workshopId: z.string().min(1, 'Workshop is required'),
  studentIds: z.array(z.string()).min(1, 'At least one student is required'),
  attendedAt: z.string().optional(),
  notes: z.string().optional(),
});

const meetingSchema = z.object({
  studentId: z.string().min(1, 'Student is required'),
  advisorId: z.string().min(1, 'Advisor is required'),
  meetingDate: z.string().min(1, 'Meeting date is required'),
  duration: z.number().optional(),
  notes: z.string().optional(),
  topics: z.array(z.string()).optional(),
});

// Participant CRUD Operations
export async function createParticipant(data: z.infer<typeof participantSchema>) {
  try {
    const validatedData = participantSchema.parse(data);
    
    // Handle SIN if provided - always provide defaults for security
    let sinLast4 = 'N/A';
    let sinHash = 'N/A';
    if (validatedData.sin && validatedData.sin.trim() !== '') {
      if (!validateSINLenient(validatedData.sin)) {
        return { error: 'Invalid SIN format' };
      }
      sinLast4 = extractSINLast4(validatedData.sin);
      sinHash = await hashSIN(validatedData.sin);
    }

    // Handle file upload if provided
    let fileUrl = '';
    let fileName = '';
    let fileType = '';
    if (validatedData.file) {
      const fileRef = ref(storage, `yep-files/${Date.now()}-${validatedData.file.name}`);
      const snapshot = await uploadBytes(fileRef, validatedData.file);
      fileUrl = await getDownloadURL(snapshot.ref);
      fileName = validatedData.file.name;
      fileType = validatedData.file.type;
    }

    const participantData = {
      youthParticipant: validatedData.youthParticipant,
      age: validatedData.age,
      email: validatedData.email || '',
      etransferEmailAddress: validatedData.etransferEmailAddress || '',
      phoneNumber: validatedData.phoneNumber || '',
      emergencyContactRelationship: validatedData.emergencyContactRelationship || '',
      emergencyContactNumber: validatedData.emergencyContactNumber || '',
      region: validatedData.region || '',
      mailingAddress: validatedData.mailingAddress || '',
      // Address fields
      streetAddress: validatedData.streetAddress || '',
      city: validatedData.city || '',
      province: validatedData.province || '',
      postalCode: validatedData.postalCode || '',
      projectCategory: validatedData.projectCategory || '',
      projectInANutshell: validatedData.projectInANutshell || '',
      contractSigned: validatedData.contractSigned ?? false,
      signedSyllabus: validatedData.signedSyllabus ?? false,
      availability: validatedData.availability || '',
      assignedMentor: validatedData.assignedMentor || '',
      idProvided: validatedData.idProvided ?? false,
      canadianStatus: validatedData.canadianStatus || 'Other',
      sin: validatedData.sin || '',
      sinNumber: validatedData.sinNumber || '',
      sinLast4: sinLast4,
      sinHash: sinHash,
      youthProposal: validatedData.youthProposal || '',
      affiliationWithSCD: validatedData.affiliationWithSCD || '',
      proofOfAffiliationWithSCD: validatedData.proofOfAffiliationWithSCD ?? false,
      scagoCounterpart: validatedData.scagoCounterpart || '',
      dob: validatedData.dob || '',
      file: validatedData.file || '',
      fileUrl: fileUrl || '',
      fileName: fileName || '',
      fileType: fileType || '',
      // Additional legacy fields
      approved: validatedData.approved ?? false,
      canadianStatusOther: validatedData.canadianStatusOther || '',
      citizenshipStatus: validatedData.citizenshipStatus || '',
      location: validatedData.location || '',
      duties: validatedData.duties || '',
      notes: validatedData.notes || '',
      nextSteps: validatedData.nextSteps || '',
      interviewed: validatedData.interviewed,
      interviewNotes: validatedData.interviewNotes || '',
      recruited: validatedData.recruited,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, 'yep_participants'), participantData);
    
    // revalidatePath('/youth-empowerment'); // Removed - not compatible with client-side usage
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error creating participant:', error);
    return { error: error instanceof Error ? error.message : 'Failed to create participant' };
  }
}

export async function updateParticipant(id: string, data: Partial<z.infer<typeof participantSchema>>) {
  try {
    // Clean the data to remove undefined values and only include fields that are actually provided
    const updateData: any = {
      updatedAt: serverTimestamp(),
    };

    // Only include fields that have values
    if (data.youthParticipant !== undefined) updateData.youthParticipant = data.youthParticipant;
    if (data.age !== undefined) updateData.age = data.age;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.etransferEmailAddress !== undefined) updateData.etransferEmailAddress = data.etransferEmailAddress;
    if (data.phoneNumber !== undefined) updateData.phoneNumber = data.phoneNumber;
    if (data.emergencyContactRelationship !== undefined) updateData.emergencyContactRelationship = data.emergencyContactRelationship;
    if (data.emergencyContactNumber !== undefined) updateData.emergencyContactNumber = data.emergencyContactNumber;
    if (data.region !== undefined) updateData.region = data.region;
    if (data.mailingAddress !== undefined) updateData.mailingAddress = data.mailingAddress;
    if (data.projectCategory !== undefined) updateData.projectCategory = data.projectCategory;
    if (data.projectInANutshell !== undefined) updateData.projectInANutshell = data.projectInANutshell;
    if (data.contractSigned !== undefined) updateData.contractSigned = data.contractSigned;
    if (data.signedSyllabus !== undefined) updateData.signedSyllabus = data.signedSyllabus;
    if (data.availability !== undefined) updateData.availability = data.availability;
    if (data.assignedMentor !== undefined) updateData.assignedMentor = data.assignedMentor;
    if (data.idProvided !== undefined) updateData.idProvided = data.idProvided;
    if (data.canadianStatus !== undefined) updateData.canadianStatus = data.canadianStatus;
    if (data.sin !== undefined) updateData.sin = data.sin;
    if (data.sinNumber !== undefined) updateData.sinNumber = data.sinNumber;
    if (data.youthProposal !== undefined) updateData.youthProposal = data.youthProposal;
    if (data.affiliationWithSCD !== undefined) updateData.affiliationWithSCD = data.affiliationWithSCD;
    if (data.proofOfAffiliationWithSCD !== undefined) updateData.proofOfAffiliationWithSCD = data.proofOfAffiliationWithSCD;
    if (data.scagoCounterpart !== undefined) updateData.scagoCounterpart = data.scagoCounterpart;
    if (data.dob !== undefined) updateData.dob = data.dob;
    if (data.file !== undefined) updateData.file = data.file;
    
    // Additional legacy fields
    if (data.approved !== undefined) updateData.approved = data.approved;
    if (data.canadianStatusOther !== undefined) updateData.canadianStatusOther = data.canadianStatusOther;
    if (data.citizenshipStatus !== undefined) updateData.citizenshipStatus = data.citizenshipStatus;
    if (data.location !== undefined) updateData.location = data.location;
    if (data.duties !== undefined) updateData.duties = data.duties;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.nextSteps !== undefined) updateData.nextSteps = data.nextSteps;
    if (data.interviewed !== undefined) updateData.interviewed = data.interviewed;
    if (data.interviewNotes !== undefined) updateData.interviewNotes = data.interviewNotes;
    if (data.recruited !== undefined) updateData.recruited = data.recruited;

    // Handle SIN update if provided
    if (data.sin && data.sin.trim() !== '') {
      if (!validateSINLenient(data.sin)) {
        return { error: 'Invalid SIN format' };
      }
      updateData.sinLast4 = extractSINLast4(data.sin);
      updateData.sinHash = await hashSIN(data.sin);
    }

    // Handle file upload if provided
    if (data.file) {
      const fileRef = ref(storage, `yep-files/${Date.now()}-${data.file.name}`);
      const snapshot = await uploadBytes(fileRef, data.file);
      updateData.fileUrl = await getDownloadURL(snapshot.ref);
      updateData.fileName = data.file.name;
      updateData.fileType = data.file.type;
    }

    await updateDoc(doc(db, 'yep_participants', id), updateData);
    
    return { success: true };
  } catch (error) {
    console.error('Error updating participant:', error);
    return { error: error instanceof Error ? error.message : 'Failed to update participant' };
  }
}

// Upsert participant by unique email
export async function upsertParticipantByEmail(data: z.infer<typeof participantSchema>) {
  try {
    const validatedData = participantSchema.parse(data);

    // Try to find existing participant by email
    const q = query(
      collection(db, 'yep_participants'),
      where('email', '==', validatedData.email),
      limit(1)
    );
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const existing = snapshot.docs[0];
      const id = existing.id;

      // Build partial update payload from validatedData
      const updatePayload: Partial<z.infer<typeof participantSchema>> = { ...validatedData };
      // updateParticipant handles hashing SIN and trimming undefineds
      const result = await updateParticipant(id, updatePayload);
      if (result?.error) return { error: result.error };
      return { success: true, id, action: 'updated' as const };
    }

    // Create new if none exists
    const created = await createParticipant(validatedData);
    if ((created as any)?.error) return { error: (created as any).error };
    return { success: true, id: (created as any).id as string, action: 'created' as const };
  } catch (error) {
    console.error('Error upserting participant by email:', error);
    return { error: error instanceof Error ? error.message : 'Failed to upsert participant' };
  }
}

export async function deleteParticipant(id: string) {
  try {
    // Delete associated file if exists
    const participantDoc = await getDoc(doc(db, 'yep_participants', id));
    if (participantDoc.exists()) {
      const data = participantDoc.data();
      if (data.fileUrl) {
        const fileRef = ref(storage, data.fileUrl);
        try {
          await deleteObject(fileRef);
        } catch (fileError) {
          console.warn('Could not delete file:', fileError);
        }
      }
    }

    await deleteDoc(doc(db, 'yep_participants', id));
    
    // revalidatePath('/youth-empowerment'); // Removed - not compatible with client-side usage
    return { success: true };
  } catch (error) {
    console.error('Error deleting participant:', error);
    return { error: error instanceof Error ? error.message : 'Failed to delete participant' };
  }
}

export async function getParticipants(filters?: {
  approved?: boolean;
  region?: string;
  mentor?: string;
}) {
  try {
    let q = query(collection(db, 'yep_participants'), orderBy('createdAt', 'desc'));
    
    if (filters?.approved !== undefined) {
      q = query(q, where('approved', '==', filters.approved));
    }
    if (filters?.region) {
      q = query(q, where('region', '==', filters.region));
    }
    if (filters?.mentor) {
      q = query(q, where('assignedMentor', '==', filters.mentor));
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        youthParticipant: data.youthParticipant || '',
        email: data.email || '',
        etransferEmailAddress: data.etransferEmailAddress || '',
        mailingAddress: data.mailingAddress || '',
        phoneNumber: data.phoneNumber || '',
        region: data.region || '',
        // Address fields
        streetAddress: data.streetAddress || '',
        city: data.city || '',
        province: data.province || '',
        postalCode: data.postalCode || '',
        approved: data.approved || false,
        contractSigned: data.contractSigned || false,
        signedSyllabus: data.signedSyllabus || false,
        availability: data.availability || '',
        assignedMentor: data.assignedMentor || '',
        idProvided: data.idProvided || false,
        canadianStatus: data.canadianStatus || 'Canadian Citizen',
        canadianStatusOther: data.canadianStatusOther || '',
        sinLast4: data.sinLast4 || '',
        sinHash: data.sinHash || '',
        youthProposal: data.youthProposal || '',
        proofOfAffiliationWithSCD: data.proofOfAffiliationWithSCD || false,
        scagoCounterpart: data.scagoCounterpart || '',
        dob: data.dob || '',
        fileUrl: data.fileUrl || '',
        fileName: data.fileName || '',
        fileType: data.fileType || '',
        // New fields from current participants data
        age: data.age || null,
        emergencyContactRelationship: data.emergencyContactRelationship || '',
        emergencyContactNumber: data.emergencyContactNumber || '',
        projectCategory: data.projectCategory || '',
        projectInANutshell: data.projectInANutshell || '',
        sin: data.sin || '',
        sinNumber: data.sinNumber || '',
        affiliationWithSCD: data.affiliationWithSCD || '',
        file: data.file || '',
        citizenshipStatus: data.citizenshipStatus || '',
        location: data.location || '',
        duties: data.duties || '',
        notes: data.notes || '',
        nextSteps: data.nextSteps || '',
        interviewed: data.interviewed || false,
        interviewNotes: data.interviewNotes || '',
        recruited: data.recruited || false,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      };
    });
  } catch (error) {
    console.error('Error fetching participants:', error);
    return [];
  }
}

// Mentor CRUD Operations
export async function createMentor(data: z.infer<typeof mentorSchema>) {
  try {
    const validatedData = mentorSchema.parse(data);
    
    const mentorData = {
      ...validatedData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, 'yep_mentors'), mentorData);
    
    // revalidatePath('/youth-empowerment'); // Removed - not compatible with client-side usage
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error creating mentor:', error);
    return { error: error instanceof Error ? error.message : 'Failed to create mentor' };
  }
}

export async function updateMentor(id: string, data: Partial<z.infer<typeof mentorSchema>>) {
  try {
    // Clean the data to remove undefined values and only include fields that are actually provided
    const updateData: any = {
      updatedAt: serverTimestamp(),
    };

    // Only include fields that have values
    if (data.name !== undefined) updateData.name = data.name;
    if (data.title !== undefined) updateData.title = data.title;
    if (data.assignedStudents !== undefined) updateData.assignedStudents = data.assignedStudents;

    await updateDoc(doc(db, 'yep_mentors', id), updateData);
    
    return { success: true };
  } catch (error) {
    console.error('Error updating mentor:', error);
    return { error: error instanceof Error ? error.message : 'Failed to update mentor' };
  }
}

export async function deleteMentor(id: string) {
  try {
    await deleteDoc(doc(db, 'yep_mentors', id));
    
    // revalidatePath('/youth-empowerment'); // Removed - not compatible with client-side usage
    return { success: true };
  } catch (error) {
    console.error('Error deleting mentor:', error);
    return { error: error instanceof Error ? error.message : 'Failed to delete mentor' };
  }
}

export async function getMentors() {
  try {
    const q = query(collection(db, 'yep_mentors'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name || '',
        title: data.title || '',
        assignedStudents: data.assignedStudents || [],
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      };
    });
  } catch (error) {
    console.error('Error fetching mentors:', error);
    return [];
  }
}

// Workshop CRUD Operations
export async function createWorkshop(data: z.infer<typeof workshopSchema>) {
  try {
    const validatedData = workshopSchema.parse(data);
    
    // Filter out undefined values to prevent Firebase errors
    const workshopData: any = {
      title: validatedData.title,
      // Store as local date to avoid off-by-one timezone issue
      date: parseLocalDateFromYMD(validatedData.date),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    // Only add description if it's not undefined or empty
    if (validatedData.description && validatedData.description.trim() !== '') {
      workshopData.description = validatedData.description;
    }

    const docRef = await addDoc(collection(db, 'yep_workshops'), workshopData);
    
    // revalidatePath('/youth-empowerment'); // Removed - not compatible with client-side usage
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error creating workshop:', error);
    return { error: error instanceof Error ? error.message : 'Failed to create workshop' };
  }
}

export async function updateWorkshop(id: string, data: Partial<z.infer<typeof workshopSchema>>) {
  try {
    const updateData: any = {
      updatedAt: serverTimestamp(),
    };

    // Only include fields that are defined and not empty
    if (data.title) {
      updateData.title = data.title;
    }
    
    if (data.date) {
      updateData.date = parseLocalDateFromYMD(data.date);
    }

    // Only update description if it's provided and not empty
    if (data.description !== undefined) {
      if (data.description && data.description.trim() !== '') {
        updateData.description = data.description;
      } else {
        // If description is empty, remove it from the document
        updateData.description = null;
      }
    }

    await updateDoc(doc(db, 'yep_workshops', id), updateData);
    
    // revalidatePath('/youth-empowerment'); // Removed - not compatible with client-side usage
    return { success: true };
  } catch (error) {
    console.error('Error updating workshop:', error);
    return { error: error instanceof Error ? error.message : 'Failed to update workshop' };
  }
}

export async function deleteWorkshop(id: string) {
  try {
    await deleteDoc(doc(db, 'yep_workshops', id));
    
    // revalidatePath('/youth-empowerment'); // Removed - not compatible with client-side usage
    return { success: true };
  } catch (error) {
    console.error('Error deleting workshop:', error);
    return { error: error instanceof Error ? error.message : 'Failed to delete workshop' };
  }
}

export async function getWorkshops() {
  try {
    const q = query(collection(db, 'yep_workshops'), orderBy('date', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title || '',
        description: data.description || '',
        date: data.date?.toDate() || new Date(),
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      };
    });
  } catch (error) {
    console.error('Error fetching workshops:', error);
    return [];
  }
}

// Attendance Operations
export async function markWorkshopAttendance(data: z.infer<typeof attendanceSchema>) {
  try {
    const validatedData = attendanceSchema.parse(data);
    
    const attendanceRecords = validatedData.studentIds.map(studentId => ({
      workshopId: validatedData.workshopId,
      studentId,
      attendedAt: validatedData.attendedAt ? new Date(validatedData.attendedAt) : new Date(),
      notes: validatedData.notes || '',
      createdAt: serverTimestamp(),
    }));

    // Batch create attendance records
    const batch = [];
    for (const record of attendanceRecords) {
      batch.push(addDoc(collection(db, 'yep_workshop_attendance'), record));
    }
    
    await Promise.all(batch);
    
    // revalidatePath('/youth-empowerment'); // Removed - not compatible with client-side usage
    return { success: true };
  } catch (error) {
    console.error('Error marking attendance:', error);
    return { error: error instanceof Error ? error.message : 'Failed to mark attendance' };
  }
}

export async function getWorkshopAttendance(workshopId?: string) {
  try {
    let q = query(collection(db, 'yep_workshop_attendance'), orderBy('attendedAt', 'desc'));
    
    if (workshopId) {
      q = query(q, where('workshopId', '==', workshopId));
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      attendedAt: doc.data().attendedAt?.toDate() || new Date(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
    }));
  } catch (error) {
    console.error('Error fetching attendance:', error);
    return [];
  }
}

// Meeting Operations
export async function createAdvisorMeeting(data: z.infer<typeof meetingSchema>) {
  try {
    const validatedData = meetingSchema.parse(data);
    
    const meetingData = {
      ...validatedData,
      meetingDate: new Date(validatedData.meetingDate),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, 'yep_advisor_meetings'), meetingData);
    
    // revalidatePath('/youth-empowerment'); // Removed - not compatible with client-side usage
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error creating meeting:', error);
    return { error: error instanceof Error ? error.message : 'Failed to create meeting' };
  }
}

export async function getAdvisorMeetings(filters?: {
  studentId?: string;
  advisorId?: string;
}) {
  try {
    let q = query(collection(db, 'yep_advisor_meetings'), orderBy('meetingDate', 'desc'));
    
    if (filters?.studentId) {
      q = query(q, where('studentId', '==', filters.studentId));
    }
    if (filters?.advisorId) {
      q = query(q, where('advisorId', '==', filters.advisorId));
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      meetingDate: doc.data().meetingDate?.toDate() || new Date(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    }));
  } catch (error) {
    console.error('Error fetching meetings:', error);
    return [];
  }
}

export async function updateAdvisorMeeting(id: string, data: Partial<z.infer<typeof meetingSchema>>) {
  try {
    const updateData: any = {
      ...data,
      updatedAt: serverTimestamp(),
    };

    if (data.meetingDate) {
      updateData.meetingDate = new Date(data.meetingDate);
    }

    await updateDoc(doc(db, 'yep_advisor_meetings', id), updateData);
    
    return { success: true };
  } catch (error) {
    console.error('Error updating meeting:', error);
    return { error: error instanceof Error ? error.message : 'Failed to update meeting' };
  }
}

// Get surveys for workshop feedback dropdown
export async function getSurveys() {
  try {
    const q = query(collection(db, 'surveys'), orderBy('title', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      title: doc.data().title || 'Untitled Survey',
      description: doc.data().description || '',
    }));
  } catch (error) {
    console.error('Error fetching surveys:', error);
    return [];
  }
}

// Delete operations
export async function deleteMeeting(meetingId: string) {
  try {
    await deleteDoc(doc(db, 'yep_advisor_meetings', meetingId));
    // revalidatePath('/youth-empowerment'); // Removed - not compatible with client-side usage
    return { success: true };
  } catch (error) {
    console.error('Error deleting meeting:', error);
    return { success: false, error: 'Failed to delete meeting' };
  }
}

export async function deleteAttendance(attendanceId: string) {
  try {
    await deleteDoc(doc(db, 'yep_workshop_attendance', attendanceId));
    // revalidatePath('/youth-empowerment'); // Removed - not compatible with client-side usage
    return { success: true };
  } catch (error) {
    console.error('Error deleting attendance:', error);
    return { success: false, error: 'Failed to delete attendance' };
  }
}
