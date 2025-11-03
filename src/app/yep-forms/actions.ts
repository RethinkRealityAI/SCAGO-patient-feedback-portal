'use server';

import { getAdminFirestore } from '@/lib/firebase-admin';
import { enforceAdminInAction, getServerSession } from '@/lib/server-auth';
import { 
  YEPFormTemplate, 
  YEPFormSubmission, 
  yepFormTemplateSchema,
  yepFormSubmissionSchema,
  YEPFormCategory 
} from '@/lib/yep-forms-types';
import { nanoid } from 'nanoid';

/**
 * Helper function to convert Firestore timestamp to Date
 * Handles both admin SDK Timestamp objects and regular Date objects
 */
function parseFirestoreTimestamp(timestamp: any): Date {
  if (!timestamp) return new Date();
  if (timestamp instanceof Date) return timestamp;
  if (timestamp && typeof timestamp.toDate === 'function') {
    return timestamp.toDate();
  }
  if (timestamp && typeof timestamp === 'object' && '_seconds' in timestamp) {
    return new Date((timestamp as any)._seconds * 1000);
  }
  if (typeof timestamp === 'string' || typeof timestamp === 'number') {
    return new Date(timestamp);
  }
  return new Date();
}

// Create a new YEP form template
export async function createYEPFormTemplate(data: Omit<YEPFormTemplate, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'version'>) {
  try {
    await enforceAdminInAction();
    const session = await getServerSession();
    const validatedData = yepFormTemplateSchema.parse(data);
    
    const formTemplate: YEPFormTemplate = {
      id: nanoid(),
      ...validatedData,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: session?.email || 'admin',
      version: 1,
    };

    const firestore = getAdminFirestore();
    await firestore.collection('yep-form-templates').doc(formTemplate.id).set(formTemplate as any);
    
    return { success: true, data: formTemplate };
  } catch (error) {
    console.error('Error creating YEP form template:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to create form template' 
    };
  }
}

// Get all YEP form templates
export async function getYEPFormTemplates() {
  try {
    await enforceAdminInAction();
    const firestore = getAdminFirestore();
    let templates: YEPFormTemplate[] = [];
    try {
      const snapshot = await firestore
        .collection('yep-form-templates')
        .where('isActive', '==', true)
        .orderBy('updatedAt', 'desc')
        .get();
      templates = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as YEPFormTemplate[];
    } catch (e: any) {
      // Fallback without composite index: fetch and sort in-memory
      const snapshot = await firestore.collection('yep-form-templates').get();
      templates = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() })) as YEPFormTemplate[];
      templates = templates
        .filter(t => (t as any).isActive === true)
        .sort((a: any, b: any) => new Date(b.updatedAt as any).getTime() - new Date(a.updatedAt as any).getTime());
    }
    
    return { success: true, data: templates };
  } catch (error) {
    console.error('Error fetching YEP form templates:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch form templates' 
    };
  }
}

// Get a single YEP form template by ID
export async function getYEPFormTemplate(id: string) {
  try {
    const firestore = getAdminFirestore();
    const docSnap = await firestore.collection('yep-form-templates').doc(id).get();
    
    if (!docSnap.exists) {
      return { success: false, error: 'Form template not found' };
    }
    
    const template = { id: docSnap.id, ...docSnap.data() } as unknown as YEPFormTemplate;
    return { success: true, data: template };
  } catch (error) {
    console.error('Error fetching YEP form template:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch form template' 
    };
  }
}

// Update a YEP form template
export async function updateYEPFormTemplate(id: string, data: Partial<Omit<YEPFormTemplate, 'id' | 'createdAt' | 'createdBy'>>) {
  try {
    await enforceAdminInAction();
    const validatedData = yepFormTemplateSchema.partial().parse(data);
    
    const updateData = {
      ...validatedData,
      updatedAt: new Date(),
      version: (data.version || 1) + 1,
    };

    const firestore = getAdminFirestore();
    await firestore.collection('yep-form-templates').doc(id).set(updateData as any, { merge: true });
    
    return { success: true };
  } catch (error) {
    console.error('Error updating YEP form template:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to update form template' 
    };
  }
}

// Delete a YEP form template (soft delete)
export async function deleteYEPFormTemplate(id: string) {
  try {
    await enforceAdminInAction();
    const firestore = getAdminFirestore();
    await firestore.collection('yep-form-templates').doc(id).set({
      isActive: false,
      updatedAt: new Date(),
    } as any, { merge: true });
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting YEP form template:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to delete form template' 
    };
  }
}

// Duplicate a YEP form template
export async function duplicateYEPFormTemplate(id: string, newName: string) {
  try {
    await enforceAdminInAction();
    const originalResult = await getYEPFormTemplate(id);
    if (!originalResult.success || !originalResult.data) {
      return { success: false, error: 'Original template not found' };
    }
    
    const original = originalResult.data;
    const duplicatedData = {
      name: newName,
      description: original.description,
      category: original.category,
      targetEntity: original.targetEntity,
      sections: original.sections,
      isTemplate: original.isTemplate,
      isActive: true,
      showInParticipantProfile: original.showInParticipantProfile || false,
    };
    
    const result = await createYEPFormTemplate(duplicatedData);
    return result;
  } catch (error) {
    console.error('Error duplicating YEP form template:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to duplicate form template' 
    };
  }
}

// Submit a YEP form
export async function submitYEPForm(formTemplateId: string, data: Record<string, any>) {
  try {
    const session = await getServerSession();
    if (!session) {
      return { success: false, error: 'Not authenticated' };
    }
    const allowed = session.role === 'participant' || session.role === 'mentor' || session.role === 'admin';
    if (!allowed) {
      return { success: false, error: 'Unauthorized' };
    }
    const validatedData = yepFormSubmissionSchema.parse({
      formTemplateId,
      data,
    });

    const firestore = getAdminFirestore();
    
    // Get form template to include name
    const templateDoc = await firestore.collection('yep-form-templates').doc(formTemplateId).get();
    const templateData = templateDoc.exists ? templateDoc.data() : null;
    const formTemplateName = templateData?.name || 'Unknown Form';

    // Get participant/mentor profile if applicable
    let participantId: string | undefined;
    let mentorId: string | undefined;
    
    if (session.role === 'participant') {
      // Find participant record
      const participantQuery = await firestore
        .collection('yep_participants')
        .where('userId', '==', session.uid)
        .limit(1)
        .get();
      
      if (participantQuery.empty && session.email) {
        // Try by email
        const emailQuery = await firestore
          .collection('yep_participants')
          .where('email', '==', session.email)
          .limit(1)
          .get();
        if (!emailQuery.empty) {
          participantId = emailQuery.docs[0].id;
        }
      } else if (!participantQuery.empty) {
        participantId = participantQuery.docs[0].id;
      }
    } else if (session.role === 'mentor') {
      // Find mentor record
      const mentorQuery = await firestore
        .collection('yep_mentors')
        .where('userId', '==', session.uid)
        .limit(1)
        .get();
      
      if (mentorQuery.empty && session.email) {
        // Try by email
        const emailQuery = await firestore
          .collection('yep_mentors')
          .where('email', '==', session.email)
          .limit(1)
          .get();
        if (!emailQuery.empty) {
          mentorId = emailQuery.docs[0].id;
        }
      } else if (!mentorQuery.empty) {
        mentorId = mentorQuery.docs[0].id;
      }
    }
    
    const submission: YEPFormSubmission = {
      id: nanoid(),
      formTemplateId: validatedData.formTemplateId,
      formTemplateName,
      submittedBy: session.email || '',
      submittedByUserId: session.uid,
      participantId,
      mentorId,
      submittedAt: new Date(),
      data: validatedData.data,
      processingStatus: 'pending',
    };

    await firestore.collection('yep-form-submissions').doc(submission.id).set(submission as any);
    
    const safeSubmission = { ...submission, submittedAt: submission.submittedAt.toISOString() };
    return { success: true, data: safeSubmission };
  } catch (error) {
    console.error('Error submitting YEP form:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to submit form' 
    };
  }
}

// Get form submissions for a template
export async function getYEPFormSubmissions(formTemplateId: string) {
  try {
    await enforceAdminInAction();
    const firestore = getAdminFirestore();
    let submissions: YEPFormSubmission[] = [];
    try {
      const snapshot = await firestore
        .collection('yep-form-submissions')
        .where('formTemplateId', '==', formTemplateId)
        .orderBy('submittedAt', 'desc')
        .get();
      submissions = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          submittedAt: parseFirestoreTimestamp(data.submittedAt).toISOString(),
          processedAt: data.processedAt ? parseFirestoreTimestamp(data.processedAt).toISOString() : undefined,
        } as unknown as YEPFormSubmission;
      });
    } catch (e: any) {
      const snapshot = await firestore.collection('yep-form-submissions').get();
      submissions = snapshot.docs
        .map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            submittedAt: parseFirestoreTimestamp(data.submittedAt).toISOString(),
            processedAt: data.processedAt ? parseFirestoreTimestamp(data.processedAt).toISOString() : undefined,
          } as unknown as YEPFormSubmission;
        })
        .filter((s: any) => s.formTemplateId === formTemplateId)
        .sort((a: any, b: any) => {
          const aDate = a.submittedAt instanceof Date ? a.submittedAt : new Date(a.submittedAt);
          const bDate = b.submittedAt instanceof Date ? b.submittedAt : new Date(b.submittedAt);
          return bDate.getTime() - aDate.getTime();
        });
    }
    
    return { success: true, data: submissions };
  } catch (error) {
    console.error('Error fetching YEP form submissions:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch form submissions' 
    };
  }
}

// Get form templates by category
export async function getYEPFormTemplatesByCategory(category: YEPFormCategory) {
  try {
    await enforceAdminInAction();
    const firestore = getAdminFirestore();
    let templates: YEPFormTemplate[] = [];
    try {
      const snapshot = await firestore
        .collection('yep-form-templates')
        .where('category', '==', category)
        .where('isActive', '==', true)
        .orderBy('updatedAt', 'desc')
        .get();
      templates = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as YEPFormTemplate[];
    } catch (e: any) {
      const snapshot = await firestore.collection('yep-form-templates').get();
      templates = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() })) as YEPFormTemplate[];
      templates = templates
        .filter((t: any) => t.category === category && t.isActive === true)
        .sort((a: any, b: any) => new Date(b.updatedAt as any).getTime() - new Date(a.updatedAt as any).getTime());
    }
    
    return { success: true, data: templates };
  } catch (error) {
    console.error('Error fetching YEP form templates by category:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch form templates' 
    };
  }
}

// Get form templates by target entity
export async function getYEPFormTemplatesByTargetEntity(targetEntity: string) {
  try {
    await enforceAdminInAction();
    const firestore = getAdminFirestore();
    let templates: YEPFormTemplate[] = [];
    try {
      const snapshot = await firestore
        .collection('yep-form-templates')
        .where('targetEntity', '==', targetEntity)
        .where('isActive', '==', true)
        .orderBy('updatedAt', 'desc')
        .get();
      templates = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as YEPFormTemplate[];
    } catch (e: any) {
      const snapshot = await firestore.collection('yep-form-templates').get();
      templates = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() })) as YEPFormTemplate[];
      templates = templates
        .filter((t: any) => t.targetEntity === targetEntity && t.isActive === true)
        .sort((a: any, b: any) => new Date(b.updatedAt as any).getTime() - new Date(a.updatedAt as any).getTime());
    }
    
    return { success: true, data: templates };
  } catch (error) {
    console.error('Error fetching YEP form templates by target entity:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch form templates' 
    };
  }
}

// Get form submissions for a participant
export async function getYEPFormSubmissionsForParticipant(participantId: string) {
  try {
    const session = await getServerSession();
    if (!session) {
      return { success: false, error: 'Not authenticated' };
    }
    
    // Verify user has access (admin or owns the participant record)
    const firestore = getAdminFirestore();
    if (session.role !== 'admin' && session.role !== 'super-admin') {
      // Verify participant belongs to user
      const participantDoc = await firestore.collection('yep_participants').doc(participantId).get();
      if (!participantDoc.exists) {
        return { success: false, error: 'Participant not found' };
      }
      const participantData = participantDoc.data();
      if (participantData?.userId !== session.uid && 
          participantData?.email !== session.email && 
          participantData?.authEmail !== session.email) {
        return { success: false, error: 'Unauthorized' };
      }
    }
    
    let submissions: YEPFormSubmission[] = [];
    
    try {
      const snapshot = await firestore
        .collection('yep-form-submissions')
        .where('participantId', '==', participantId)
        .orderBy('submittedAt', 'desc')
        .get();
      submissions = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          submittedAt: parseFirestoreTimestamp(data.submittedAt).toISOString(),
          processedAt: data.processedAt ? parseFirestoreTimestamp(data.processedAt).toISOString() : undefined,
        } as unknown as YEPFormSubmission;
      });
    } catch (e: any) {
      // Fallback without composite index: fetch and filter in-memory
      const snapshot = await firestore.collection('yep-form-submissions').get();
      submissions = snapshot.docs
        .map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            submittedAt: parseFirestoreTimestamp(data.submittedAt).toISOString(),
            processedAt: data.processedAt ? parseFirestoreTimestamp(data.processedAt).toISOString() : undefined,
          } as unknown as YEPFormSubmission;
        })
        .filter((s: any) => s.participantId === participantId)
        .sort((a: any, b: any) => {
          const aDate = a.submittedAt instanceof Date ? a.submittedAt : new Date(a.submittedAt);
          const bDate = b.submittedAt instanceof Date ? b.submittedAt : new Date(b.submittedAt);
          return bDate.getTime() - aDate.getTime();
        });
    }
    
    return { success: true, data: submissions };
  } catch (error) {
    console.error('Error fetching participant form submissions:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch submissions' 
    };
  }
}

// Get form templates available for participant profile
export async function getYEPFormTemplatesForParticipantProfile() {
  try {
    const session = await getServerSession();
    if (!session) {
      return { success: false, error: 'Not authenticated' };
    }
    
    // Only allow participants and admins to access forms for participant profile
    if (session.role !== 'participant' && session.role !== 'admin' && session.role !== 'super-admin') {
      return { success: false, error: 'Unauthorized - only participants and admins can access profile forms' };
    }
    
    const firestore = getAdminFirestore();
    let templates: YEPFormTemplate[] = [];
    
    try {
      const snapshot = await firestore
        .collection('yep-form-templates')
        .where('showInParticipantProfile', '==', true)
        .where('isActive', '==', true)
        .orderBy('updatedAt', 'desc')
        .get();
      templates = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: parseFirestoreTimestamp(data.createdAt).toISOString(),
          updatedAt: parseFirestoreTimestamp(data.updatedAt).toISOString(),
        } as unknown as YEPFormTemplate;
      });
    } catch (e: any) {
      // Fallback without composite index: fetch and filter in-memory
      const snapshot = await firestore.collection('yep-form-templates').get();
      templates = snapshot.docs
        .map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            createdAt: parseFirestoreTimestamp(data.createdAt).toISOString(),
            updatedAt: parseFirestoreTimestamp(data.updatedAt).toISOString(),
          } as unknown as YEPFormTemplate;
        })
        .filter((t: any) => t.showInParticipantProfile === true && t.isActive === true)
        .sort((a: any, b: any) => {
          const aDate = a.updatedAt instanceof Date ? a.updatedAt : new Date(a.updatedAt);
          const bDate = b.updatedAt instanceof Date ? b.updatedAt : new Date(b.updatedAt);
          return bDate.getTime() - aDate.getTime();
        });
    }
    
    return { success: true, data: templates };
  } catch (error) {
    console.error('Error fetching YEP form templates for participant profile:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch form templates' 
    };
  }
}



