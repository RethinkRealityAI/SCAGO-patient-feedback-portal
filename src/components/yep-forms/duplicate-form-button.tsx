'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { duplicateYEPFormTemplate } from '@/app/yep-forms/duplicate-actions';

interface DuplicateYEPFormButtonProps {
  formId: string;
  formName: string;
  onDuplicated?: () => void;
  children?: React.ReactNode;
}

export function DuplicateYEPFormButton({ 
  formId, 
  formName, 
  onDuplicated,
  children 
}: DuplicateYEPFormButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [newName, setNewName] = useState(`${formName} (Copy)`);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleDuplicate = async () => {
    if (!newName.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a name for the duplicated form.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await duplicateYEPFormTemplate(formId, newName.trim());
      if (result.success) {
        toast({
          title: 'Form Duplicated',
          description: `Created "${newName}" successfully.`,
        });
        setIsOpen(false);
        setNewName(`${formName} (Copy)`);
        onDuplicated?.();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to duplicate form.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error duplicating form:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="ghost" size="sm">
            <Copy className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Duplicate Form</DialogTitle>
          <DialogDescription>
            Create a copy of "{formName}" with a new name.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="newName">New Form Name</Label>
            <Input
              id="newName"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Enter new form name"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleDuplicate} disabled={isLoading}>
            {isLoading ? 'Duplicating...' : 'Duplicate Form'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
