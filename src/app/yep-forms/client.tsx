'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { yepFormTemplates } from '@/lib/yep-form-templates';
import { Plus, ChevronDown, FileText, Copy, Trash2 } from 'lucide-react';
import { db, auth } from '@/lib/firebase';
import { doc, setDoc, updateDoc, getDoc } from 'firebase/firestore';
import { nanoid } from 'nanoid';
import { yepFormTemplateSchema, type YEPFormTemplate } from '@/lib/yep-forms-types';

// Client-side helpers using authenticated client SDK
export async function createYEPFormTemplateClient(template: Omit<YEPFormTemplate, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'version'>) {
  try {
    const validated = yepFormTemplateSchema.parse(template);
    const formTemplate: YEPFormTemplate = {
      id: nanoid(),
      ...validated,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: auth.currentUser?.email || 'system',
      version: 1,
    };
    await setDoc(doc(db, 'yep-form-templates', formTemplate.id), formTemplate as any);
    return { success: true, data: formTemplate };
  } catch (error) {
    console.error('Error creating form (client):', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create form' };
  }
}

export async function deleteYEPFormTemplateClient(id: string) {
  try {
    await updateDoc(doc(db, 'yep-form-templates', id), { isActive: false, updatedAt: new Date() } as any);
    return { success: true };
  } catch (error) {
    console.error('Error deleting form (client):', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to delete form' };
  }
}

export async function duplicateYEPFormTemplateClient(id: string, newName: string) {
  try {
    const snap = await getDoc(doc(db, 'yep-form-templates', id));
    if (!snap.exists()) return { success: false, error: 'Original template not found' };
    const original = snap.data() as YEPFormTemplate;
    const data = {
      name: newName,
      description: original.description,
      category: original.category,
      targetEntity: (original as any).targetEntity,
      sections: original.sections,
      isTemplate: original.isTemplate,
      isActive: true,
    } as any;
    return await createYEPFormTemplateClient(data);
  } catch (error) {
    console.error('Error duplicating form (client):', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to duplicate form' };
  }
}

interface CreateYEPFormDropdownProps { onFormCreated?: (template: any) => void }

export function CreateYEPFormDropdown({ onFormCreated }: CreateYEPFormDropdownProps) {
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  const handleCreateFromTemplate = async (template: any) => {
    setIsCreating(true);
    try {
      const result = await createYEPFormTemplateClient(template);
      
      if (result.success) {
        toast({
          title: 'Form Created',
          description: `Created "${template.name}" successfully.`,
        });
        onFormCreated?.(result);
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to create form',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error creating form:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button disabled={isCreating}>
          <Plus className="mr-2 h-4 w-4" />
          Create Form
          <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {yepFormTemplates.map((template) => (
          <DropdownMenuItem
            key={template.category}
            onClick={() => handleCreateFromTemplate(template)}
            disabled={isCreating}
            className="flex items-center gap-2"
          >
            <FileText className="h-4 w-4" />
            {template.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface DeleteYEPFormButtonProps {
  formId: string;
  children: React.ReactNode;
  onDeleted?: () => void;
}

export function DeleteYEPFormButton({ formId, children, onDeleted }: DeleteYEPFormButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteYEPFormTemplateClient(formId);
      
      if (result.success) {
        toast({
          title: 'Form Deleted',
          description: 'The form has been deleted successfully.',
        });
        onDeleted?.();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to delete form',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error deleting form:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button 
          variant="destructive" 
          size="icon" 
          disabled={isDeleting}
          className="h-8 w-8"
        >
          {children}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This will delete the form template. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

interface DuplicateYEPFormButtonProps {
  formId: string;
  formName: string;
  children: React.ReactNode;
  onDuplicated?: () => void;
}

export function DuplicateYEPFormButton({ formId, formName, children, onDuplicated }: DuplicateYEPFormButtonProps) {
  const [isDuplicating, setIsDuplicating] = useState(false);
  const { toast } = useToast();

  const handleDuplicate = async () => {
    setIsDuplicating(true);
    try {
      const newName = `${formName} (Copy)`;
      const result = await duplicateYEPFormTemplateClient(formId, newName);
      
      if (result.success) {
        toast({
          title: 'Form Duplicated',
          description: `Created "${newName}" successfully.`,
        });
        onDuplicated?.();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to duplicate form',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error duplicating form:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsDuplicating(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={handleDuplicate}
      disabled={isDuplicating}
      className="h-8 w-8"
    >
      {children}
    </Button>
  );
}
