'use server';

import { db } from '@/lib/firebase-admin';
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
    const validatedData = yepFormTemplateSchema.parse(data);
    
    const formTemplate: YEPFormTemplate = {
      id: nanoid(),
      ...validatedData,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system', // TODO: Get from auth context
      version: 1,
    };

    await db.collection('yep-form-templates').doc(formTemplate.id).set(formTemplate);
    
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
    const snapshot = await db.collection('yep-form-templates')
      .where('isActive', '==', true)
      .orderBy('updatedAt', 'desc')
      .get();
    
    const templates = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as YEPFormTemplate[];
    
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
    const doc = await db.collection('yep-form-templates').doc(id).get();
    
    if (!doc.exists) {
      return { success: false, error: 'Form template not found' };
    }
    
    const template = { id: doc.id, ...doc.data() } as YEPFormTemplate;
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
    const validatedData = yepFormTemplateSchema.partial().parse(data);
    
    const updateData = {
      ...validatedData,
      updatedAt: new Date(),
      version: (data.version || 1) + 1,
    };

    await db.collection('yep-form-templates').doc(id).update(updateData);
    
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
    await db.collection('yep-form-templates').doc(id).update({
      isActive: false,
      updatedAt: new Date(),
    });
    
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
    const validatedData = yepFormSubmissionSchema.parse({
      formTemplateId,
      data,
    });
    
    const submission: YEPFormSubmission = {
      id: nanoid(),
      formTemplateId: validatedData.formTemplateId,
      submittedBy: 'system', // TODO: Get from auth context
      submittedAt: new Date(),
      data: validatedData.data,
      processingStatus: 'pending',
    };

    await db.collection('yep-form-submissions').doc(submission.id).set(submission);
    
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
    const snapshot = await db.collection('yep-form-submissions')
      .where('formTemplateId', '==', formTemplateId)
      .orderBy('submittedAt', 'desc')
      .get();
    
    const submissions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as YEPFormSubmission[];
    
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
    const snapshot = await db.collection('yep-form-templates')
      .where('category', '==', category)
      .where('isActive', '==', true)
      .orderBy('updatedAt', 'desc')
      .get();
    
    const templates = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as YEPFormTemplate[];
    
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
    const snapshot = await db.collection('yep-form-templates')
      .where('targetEntity', '==', targetEntity)
      .where('isActive', '==', true)
      .orderBy('updatedAt', 'desc')
      .get();
    
    const templates = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as YEPFormTemplate[];
    
    return { success: true, data: templates };
  } catch (error) {
    console.error('Error fetching YEP form templates by target entity:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch form templates' 
    };
  }
}
