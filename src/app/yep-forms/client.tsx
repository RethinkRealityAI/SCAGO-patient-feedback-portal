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
import { 
  createYEPFormTemplate, 
  deleteYEPFormTemplate, 
  duplicateYEPFormTemplate 
} from './actions';
import { yepFormTemplates } from '@/lib/yep-form-templates';
import { Plus, ChevronDown, FileText, Copy, Trash2 } from 'lucide-react';

interface CreateYEPFormDropdownProps {}

export function CreateYEPFormDropdown({}: CreateYEPFormDropdownProps) {
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  const handleCreateFromTemplate = async (template: any) => {
    setIsCreating(true);
    try {
      const result = await createYEPFormTemplate(template);
      
      if (result.success) {
        toast({
          title: 'Form Created',
          description: `Created "${template.name}" successfully.`,
        });
        // Refresh the page to show the new form
        window.location.reload();
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
}

export function DeleteYEPFormButton({ formId, children }: DeleteYEPFormButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteYEPFormTemplate(formId);
      
      if (result.success) {
        toast({
          title: 'Form Deleted',
          description: 'The form has been deleted successfully.',
        });
        // Refresh the page to remove the deleted form
        window.location.reload();
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
}

export function DuplicateYEPFormButton({ formId, formName, children }: DuplicateYEPFormButtonProps) {
  const [isDuplicating, setIsDuplicating] = useState(false);
  const { toast } = useToast();

  const handleDuplicate = async () => {
    setIsDuplicating(true);
    try {
      const newName = `${formName} (Copy)`;
      const result = await duplicateYEPFormTemplate(formId, newName);
      
      if (result.success) {
        toast({
          title: 'Form Duplicated',
          description: `Created "${newName}" successfully.`,
        });
        // Refresh the page to show the new form
        window.location.reload();
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
