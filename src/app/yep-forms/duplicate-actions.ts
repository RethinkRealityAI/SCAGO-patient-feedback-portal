'use server';

import { getYEPFormTemplate, createYEPFormTemplate } from './actions';
import { YEPFormCategory } from '@/lib/yep-forms-types';

// Duplicate a YEP form template
export async function duplicateYEPFormTemplate(originalId: string, newName: string) {
  try {
    // Get the original template
    const originalResult = await getYEPFormTemplate(originalId);
    if (!originalResult.success) {
      return { success: false, error: 'Original form template not found' };
    }

    const originalTemplate = originalResult.data! as any;

    // Build minimal payload expected by createYEPFormTemplate (schema enforces the rest)
    const result = await createYEPFormTemplate({
      name: newName || `${originalTemplate.name} (Copy)` ,
      description: originalTemplate.description || '',
      category: originalTemplate.category as YEPFormCategory,
      targetEntity: originalTemplate.targetEntity,
      sections: originalTemplate.sections || [],
      isTemplate: true,
      isActive: false,
    } as any);
    return result;
  } catch (error) {
    console.error('Error duplicating YEP form template:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to duplicate form template' 
    };
  }
}
