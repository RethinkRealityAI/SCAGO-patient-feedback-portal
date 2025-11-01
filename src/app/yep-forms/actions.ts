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
    
    if (!docSnap.exists()) {
      return { success: false, error: 'Form template not found' };
    }
    
    const template = { id: docSnap.id, ...docSnap.data() } as YEPFormTemplate;
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
    
    const submission: YEPFormSubmission = {
      id: nanoid(),
      formTemplateId: validatedData.formTemplateId,
      submittedBy: session.email,
      submittedAt: new Date(),
      data: validatedData.data,
      processingStatus: 'pending',
    };

    const firestore = getAdminFirestore();
    await firestore.collection('yep-form-submissions').doc(submission.id).set(submission as any);
    
    return { success: true, data: submission };
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
      submissions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as YEPFormSubmission[];
    } catch (e: any) {
      const snapshot = await firestore.collection('yep-form-submissions').get();
      submissions = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() })) as YEPFormSubmission[];
      submissions = submissions
        .filter((s: any) => s.formTemplateId === formTemplateId)
        .sort((a: any, b: any) => new Date(b.submittedAt as any).getTime() - new Date(a.submittedAt as any).getTime());
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
