'use client';

import { useRouter } from 'next/navigation';
import { useTransition, ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader, Trash2, Plus, ChevronDown } from 'lucide-react';
import { createBlankSurvey, createSurvey, createSurveyV2, createConsentSurvey, deleteSurvey } from './actions';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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

export function CreateSurveyV2Button() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleCreateSurvey = () => {
    startTransition(async () => {
      const survey = await createSurveyV2();
      router.push(`/editor/${survey.id}`);
    });
  };

  return (
    <Button onClick={handleCreateSurvey} disabled={isPending} variant="secondary">
      {isPending && <Loader className="mr-2 h-4 w-4 animate-spin" />}
      New Survey (V2)
    </Button>
  );
}

export function CreateSurveyDropdown() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleCreateSurvey = (templateType: 'blank' | 'default' | 'v2' | 'consent') => {
    startTransition(async () => {
      let survey;
      switch (templateType) {
        case 'blank':
          survey = await createBlankSurvey();
          break;
        case 'v2':
          survey = await createSurveyV2();
          break;
        case 'consent':
          survey = await createConsentSurvey();
          break;
        default:
          survey = await createSurvey();
      }
      router.push(`/editor/${survey.id}`);
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button disabled={isPending}>
          {isPending ? (
            <Loader className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Plus className="mr-2 h-4 w-4" />
          )}
          New Survey
          <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>Choose a Template</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => handleCreateSurvey('blank')}
          disabled={isPending}
        >
          <div className="flex flex-col gap-1">
            <span className="font-medium">✨ Blank Survey</span>
            <span className="text-xs text-muted-foreground">
              Start from scratch with an empty survey. Build your form from the ground up.
            </span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => handleCreateSurvey('default')}
          disabled={isPending}
        >
          <div className="flex flex-col gap-1">
            <span className="font-medium">Patient Feedback Survey</span>
            <span className="text-xs text-muted-foreground">
              Standard feedback form with contact info and hospital experience sections
            </span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleCreateSurvey('v2')}
          disabled={isPending}
        >
          <div className="flex flex-col gap-1">
            <span className="font-medium">Patient Feedback Survey (V2)</span>
            <span className="text-xs text-muted-foreground">
              Adaptive form with visit-type specific questions (Outpatient, Emergency, Inpatient)
            </span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleCreateSurvey('consent')}
          disabled={isPending}
        >
          <div className="flex flex-col gap-1">
            <span className="font-medium">Digital Consent & Information Collection</span>
            <span className="text-xs text-muted-foreground">
              SCAGO consent form for patient registration and information collection
            </span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
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
