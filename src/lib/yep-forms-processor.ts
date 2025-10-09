import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore';
import { 
  createMentor, 
  updateMentor, 
  createParticipant, 
  updateParticipant,
  createWorkshop,
  updateWorkshop,
  createAdvisorMeeting,
  updateAdvisorMeeting,
  markWorkshopAttendance
} from '@/app/youth-empowerment/actions';
// Note: SIN hashing is handled inside create/update participant actions
import { YEPFormTemplate, YEPFormSubmission } from './yep-forms-types';

export interface ProcessingResult {
  success: boolean;
  error?: string;
  createdEntities?: {
    participantIds?: string[];
    mentorIds?: string[];
    workshopIds?: string[];
    meetingIds?: string[];
    attendanceIds?: string[];
  };
}

/**
 * Process a YEP form submission and create/update the appropriate entities
 */
export async function processYEPFormSubmission(
  submission: YEPFormSubmission,
  template: YEPFormTemplate
): Promise<ProcessingResult> {
  try {
    const result: ProcessingResult = {
      success: true,
      createdEntities: {
        participantIds: [],
        mentorIds: [],
        workshopIds: [],
        meetingIds: [],
        attendanceIds: []
      }
    };

    // Process based on form category
    switch (template.category) {
      case 'mentor':
        await processMentorForm(submission, template, result);
        break;
      case 'participant':
        await processParticipantForm(submission, template, result);
        break;
      case 'workshop':
        await processWorkshopForm(submission, template, result);
        break;
      case 'meeting':
        await processMeetingForm(submission, template, result);
        break;
      case 'bulk_attendance':
        await processBulkAttendanceForm(submission, template, result);
        break;
      case 'bulk_meeting':
        await processBulkMeetingForm(submission, template, result);
        break;
      default:
        throw new Error(`Unknown form category: ${template.category}`);
    }

    // Update submission status
    await updateDoc(doc(db, 'yep-form-submissions', submission.id), {
      processedAt: new Date(),
      processingStatus: 'completed',
      createdEntities: result.createdEntities
    });

    return result;
  } catch (error) {
    console.error('Error processing YEP form submission:', error);
    
    // Update submission status to failed
    await updateDoc(doc(db, 'yep-form-submissions', submission.id), {
      processedAt: new Date(),
      processingStatus: 'failed',
      errorMessage: error instanceof Error ? error.message : 'Unknown error'
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Process mentor form submission
 */
async function processMentorForm(
  submission: YEPFormSubmission,
  template: YEPFormTemplate,
  result: ProcessingResult
) {
  const data = submission.data;
  
  // Extract mentor data from form
  const mentorData = {
    name: data.mentorName || '',
    title: data.mentorTitle || '',
    assignedStudents: data.assignedStudents || []
  };

  // Create or update mentor
  const mentorResult = await createMentor(mentorData);
  
  if (mentorResult.success && mentorResult.id) {
    result.createdEntities!.mentorIds!.push(mentorResult.id);
  } else {
    throw new Error(`Failed to create mentor: ${mentorResult.error}`);
  }
}

/**
 * Process participant form submission
 */
async function processParticipantForm(
  submission: YEPFormSubmission,
  template: YEPFormTemplate,
  result: ProcessingResult
) {
  const data = submission.data;
  
  // Extract participant data from form
  const participantData = {
    youthParticipant: data.youthParticipant || '',
    email: data.email || '',
    region: data.region || '',
    dob: data.dob || data.dateOfBirth || '',
    approved: Boolean(data.approved),
    contractSigned: Boolean(data.contractSigned),
    signedSyllabus: Boolean(data.signedSyllabus),
    idProvided: Boolean(data.idProvided),
    proofOfAffiliationWithSCD: Boolean(data.proofOfAffiliationWithSCD ?? data.proofOfSCDAffiliation),
    availability: data.availability || '',
    assignedMentor: data.assignedMentor || '',
    scagoCounterpart: data.scagoCounterpart || '',
    canadianStatus: (data.canadianStatus as any) || 'Other',
    sin: data.sin || '',
    youthProposal: data.youthProposal || '',
  };

  // Create or update participant
  const participantResult = await createParticipant(participantData);
  
  if (participantResult.success && participantResult.id) {
    result.createdEntities!.participantIds!.push(participantResult.id);
  } else {
    throw new Error(`Failed to create participant: ${participantResult.error}`);
  }
}

/**
 * Process workshop form submission
 */
async function processWorkshopForm(
  submission: YEPFormSubmission,
  template: YEPFormTemplate,
  result: ProcessingResult
) {
  const data = submission.data;
  
  // Extract workshop data from form
  const workshopData = {
    title: data.workshopTitle || data.title || '',
    description: data.description || '',
    date: data.workshopDate || data.date || '',
    location: data.location || '',
    capacity: typeof data.capacity === 'number' ? data.capacity : Number(data.capacity || 0),
    feedbackSurveyId: data.feedbackSurveyId || data.feedbackSurvey || ''
  };

  // Create or update workshop
  const workshopResult = await createWorkshop(workshopData);
  
  if (workshopResult.success && workshopResult.id) {
    result.createdEntities!.workshopIds!.push(workshopResult.id);
  } else {
    throw new Error(`Failed to create workshop: ${workshopResult.error}`);
  }
}

/**
 * Process meeting form submission
 */
async function processMeetingForm(
  submission: YEPFormSubmission,
  template: YEPFormTemplate,
  result: ProcessingResult
) {
  const data = submission.data;
  
  // Extract meeting data from form
  const meetingData = {
    studentId: data.participantId || data.participant || '',
    advisorId: data.advisorId || data.advisor || '',
    meetingDate: data.meetingDateTime || '',
    duration: data.duration || 0,
    topics: data.discussionTopics || [],
    notes: data.notes || ''
  };

  // Create meeting
  const meetingResult = await createAdvisorMeeting(meetingData);
  
  if (meetingResult.success && meetingResult.id) {
    result.createdEntities!.meetingIds!.push(meetingResult.id);
  } else {
    throw new Error(`Failed to create meeting: ${meetingResult.error}`);
  }
}

/**
 * Process bulk attendance form submission
 */
async function processBulkAttendanceForm(
  submission: YEPFormSubmission,
  template: YEPFormTemplate,
  result: ProcessingResult
) {
  const data = submission.data;
  const attendanceData = data.attendanceData || [];
  
  // Process bulk attendance using the existing markWorkshopAttendance function
  const studentIds = (attendanceData as Array<{ attended?: boolean; participantId?: string }>)
    .filter((record) => !!record.attended)
    .map((record) => record.participantId as string)
    .filter(Boolean);
    
  if (studentIds.length > 0) {
    const attendanceResult = await markWorkshopAttendance({
      workshopId: data.workshop || '',
      studentIds: studentIds,
      attendedAt: new Date().toISOString(),
      notes: 'Bulk attendance entry'
    });
    
    if (attendanceResult.success) {
      result.createdEntities!.attendanceIds!.push('bulk-attendance-' + Date.now());
    } else {
      console.error(`Failed to create bulk attendance: ${attendanceResult.error}`);
    }
  }
}

/**
 * Process bulk meeting form submission
 */
async function processBulkMeetingForm(
  submission: YEPFormSubmission,
  template: YEPFormTemplate,
  result: ProcessingResult
) {
  const data = submission.data;
  const meetingData = data.meetingData || [];
  
  // Process each meeting record
  for (const record of meetingData) {
    const meetingResult = await createAdvisorMeeting({
      studentId: record.studentId || '',
      advisorId: record.advisorId || '',
      meetingDate: record.meetingDate || '',
      duration: record.duration || 0,
      topics: record.topics || [],
      notes: record.notes || ''
    });
    
    if (meetingResult.success && meetingResult.id) {
      result.createdEntities!.meetingIds!.push(meetingResult.id);
    } else {
      console.error(`Failed to create meeting record: ${meetingResult.error}`);
    }
  }
}

/**
 * Get form submission by ID
 */
export async function getYEPFormSubmission(submissionId: string) {
  try {
    const docRef = doc(db, 'yep-form-submissions', submissionId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return { success: false, error: 'Submission not found' };
    }
    
    const submission = { id: docSnap.id, ...docSnap.data() } as YEPFormSubmission;
    return { success: true, data: submission };
  } catch (error) {
    console.error('Error fetching form submission:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch submission' 
    };
  }
}

/**
 * Get all form submissions for a template
 */
export async function getYEPFormSubmissionsForTemplate(templateId: string) {
  try {
    const q = query(
      collection(db, 'yep-form-submissions'),
      where('formTemplateId', '==', templateId),
      orderBy('submittedAt', 'desc')
    );
    const snapshot = await getDocs(q);
    
    const submissions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as YEPFormSubmission[];
    
    return { success: true, data: submissions };
  } catch (error) {
    console.error('Error fetching form submissions:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch submissions' 
    };
  }
}

/**
 * Process pending form submissions (for background processing)
 */
export async function processPendingSubmissions() {
  try {
    const q = query(
      collection(db, 'yep-form-submissions'),
      where('processingStatus', '==', 'pending'),
      limit(10)
    );
    const snapshot = await getDocs(q);
    
    const results = [];
    
    for (const submissionDoc of snapshot.docs) {
      const submission = { id: submissionDoc.id, ...submissionDoc.data() } as YEPFormSubmission;
      
      // Get the form template
      const templateDocRef = doc(db, 'yep-form-templates', submission.formTemplateId);
      const templateDoc = await getDoc(templateDocRef);
      if (!templateDoc.exists()) {
        console.error(`Template not found for submission ${submission.id}`);
        continue;
      }
      
      const template = { id: templateDoc.id, ...templateDoc.data() } as YEPFormTemplate;
      
      // Process the submission
      const result = await processYEPFormSubmission(submission, template);
      results.push({ submissionId: submission.id, result });
    }
    
    return { success: true, data: results };
  } catch (error) {
    console.error('Error processing pending submissions:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to process submissions' 
    };
  }
}
