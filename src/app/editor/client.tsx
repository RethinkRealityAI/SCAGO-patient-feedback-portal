'use client';

import { useRouter } from 'next/navigation';
import { useTransition, ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader, Trash2 } from 'lucide-react';
import { createSurvey, deleteSurvey } from './actions';

export function CreateSurveyButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleCreateSurvey = () => {
    startTransition(async () => {
      const survey = await createSurvey();
      router.push(`/editor/${survey.id}`);
    });
  };

  return (
    <Button onClick={handleCreateSurvey} disabled={isPending}>
      {isPending && <Loader className="mr-2 h-4 w-4 animate-spin" />}
      New Survey
    </Button>
  );
}

export function DeleteSurveyButton({
  surveyId,
  children,
}: {
  surveyId: string;
  children: ReactNode;
}) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteSurvey(surveyId);
      if (result?.error) {
        toast({
          title: 'Error',
          description: result.error,
          variant: 'destructive',
        });
        return;
      }
      toast({
        title: 'Success',
        description: 'Survey deleted successfully.',
      });
    });
  };

  return (
    <Button
      variant="destructive"
      size="sm"
      onClick={handleDelete}
      disabled={isPending}
    >
      {isPending ? (
        <Loader className="h-4 w-4 animate-spin" />
      ) : (
        children
      )}
    </Button>
  );
}
