import { z } from 'zod';
import { db } from '@/lib/firebase';
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
import { hashSIN, extractSINLast4, validateSIN } from '@/lib/youth-empowerment';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

// Validation Schemas
const participantSchema = z.object({
  youthParticipant: z.string().min(2, 'Name is required'),
  email: z.string().email('Valid email is required'),
  region: z.string().min(2, 'Region is required'),
  approved: z.boolean().default(false),
  contractSigned: z.boolean().default(false),
  signedSyllabus: z.boolean().default(false),
  availability: z.string().optional(),
  assignedMentor: z.string().optional(),
  idProvided: z.boolean().default(false),
  canadianStatus: z.enum(['Canadian Citizen', 'Permanent Resident', 'Other']),
  sin: z.string().optional(),
  youthProposal: z.string().optional(),
  proofOfAffiliationWithSCD: z.boolean().default(false),
  scagoCounterpart: z.string().optional(),
  dob: z.string().min(1, 'Date of birth is required'),
  file: z.instanceof(File).optional(),
});

const mentorSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  title: z.string().min(2, 'Title is required'),
  assignedStudents: z.array(z.string()).default([]),
});

const workshopSchema = z.object({
  title: z.string().min(3, 'Title is required'),
  description: z.string().min(10, 'Description is required'),
  date: z.string().min(1, 'Date is required'),
  location: z.string().optional(),
  capacity: z.number().optional(),
  feedbackSurveyId: z.string().optional(),
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
    
    // Handle SIN if provided
    let sinLast4 = '';
    let sinHash = '';
    if (validatedData.sin) {
      if (!validateSIN(validatedData.sin)) {
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
      const storage = getStorage();
      const fileRef = ref(storage, `yep-files/${Date.now()}-${validatedData.file.name}`);
      const snapshot = await uploadBytes(fileRef, validatedData.file);
      fileUrl = await getDownloadURL(snapshot.ref);
      fileName = validatedData.file.name;
      fileType = validatedData.file.type;
    }

    const participantData = {
      youthParticipant: validatedData.youthParticipant,
      email: validatedData.email,
      region: validatedData.region,
      approved: validatedData.approved,
      contractSigned: validatedData.contractSigned,
      signedSyllabus: validatedData.signedSyllabus,
      availability: validatedData.availability || '',
      assignedMentor: validatedData.assignedMentor || '',
      idProvided: validatedData.idProvided,
      canadianStatus: validatedData.canadianStatus,
      sinLast4,
      sinHash,
      youthProposal: validatedData.youthProposal || '',
      proofOfAffiliationWithSCD: validatedData.proofOfAffiliationWithSCD,
      scagoCounterpart: validatedData.scagoCounterpart || '',
      dob: validatedData.dob,
      fileUrl,
      fileName,
      fileType,
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
    const updateData: any = {
      ...data,
      updatedAt: serverTimestamp(),
    };

    // Handle SIN update if provided
    if (data.sin) {
      if (!validateSIN(data.sin)) {
        return { error: 'Invalid SIN format' };
      }
      updateData.sinLast4 = extractSINLast4(data.sin);
      updateData.sinHash = await hashSIN(data.sin);
      delete updateData.sin; // Remove raw SIN from update
    }

    // Handle file upload if provided
    if (data.file) {
      const storage = getStorage();
      const fileRef = ref(storage, `yep-files/${Date.now()}-${data.file.name}`);
      const snapshot = await uploadBytes(fileRef, data.file);
      updateData.fileUrl = await getDownloadURL(snapshot.ref);
      updateData.fileName = data.file.name;
      updateData.fileType = data.file.type;
    }

    await updateDoc(doc(db, 'yep_participants', id), updateData);
    
    // revalidatePath('/youth-empowerment'); // Removed - not compatible with client-side usage
    return { success: true };
  } catch (error) {
    console.error('Error updating participant:', error);
    return { error: error instanceof Error ? error.message : 'Failed to update participant' };
  }
}

export async function deleteParticipant(id: string) {
  try {
    // Delete associated file if exists
    const participantDoc = await getDoc(doc(db, 'yep_participants', id));
    if (participantDoc.exists()) {
      const data = participantDoc.data();
      if (data.fileUrl) {
        const storage = getStorage();
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
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    }));
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
    await updateDoc(doc(db, 'yep_mentors', id), {
      ...data,
      updatedAt: serverTimestamp(),
    });
    
    // revalidatePath('/youth-empowerment'); // Removed - not compatible with client-side usage
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
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    }));
  } catch (error) {
    console.error('Error fetching mentors:', error);
    return [];
  }
}

// Workshop CRUD Operations
export async function createWorkshop(data: z.infer<typeof workshopSchema>) {
  try {
    const validatedData = workshopSchema.parse(data);
    
    const workshopData = {
      ...validatedData,
      date: new Date(validatedData.date),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

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
      ...data,
      updatedAt: serverTimestamp(),
    };

    if (data.date) {
      updateData.date = new Date(data.date);
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
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      date: doc.data().date?.toDate() || new Date(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    }));
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
