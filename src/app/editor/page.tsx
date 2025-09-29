import React from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { CreateSurveyDropdown, DeleteSurveyButton } from './client';
import { Skeleton } from '@/components/ui/skeleton';
import { Trash2 } from 'lucide-react';
import { listSurveys } from './actions';

function SurveyListSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-between glass-card p-4"
        >
          <div>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="mt-2 h-4 w-24" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 w-20" />
            <Skeleton className="h-10 w-10" />
          </div>
        </div>
      ))}
    </div>
  );
}

async function SurveyList() {
  const surveys = await listSurveys();

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
      {surveys.map((survey: any) => (
        <div
          key={survey.id}
          className="glass-card p-6 group hover:-translate-y-1 transition-all duration-300 hover:shadow-lg"
        >
          <div className="flex flex-col space-y-4">
            {/* Header with title and subtitle */}
            <div className="space-y-2">
              <h2 className="text-xl font-bold group-hover:text-primary transition-colors leading-tight">
                {survey.name || survey.title || 'Untitled Survey'}
              </h2>
              <p className="text-sm text-muted-foreground font-medium">
                {(survey.sections?.reduce((sum: number, section: any) => sum + (section.fields?.length || 0), 0)) ?? 0} questions
              </p>
            </div>
            
            {/* Action buttons - organized in a clean row */}
            <div className="flex items-center justify-between pt-2 border-t border-border/50">
              <div className="flex items-center gap-2">
                <Button asChild size="sm" variant="outline" className="h-8">
                  <Link href={`/dashboard/${survey.id}`}>Dashboard</Link>
                </Button>
                <Button asChild size="sm" variant="secondary" className="h-8">
                  <Link href={`/survey/${survey.id}`}>View</Link>
                </Button>
                <Button asChild size="sm" className="h-8">
                  <Link href={`/editor/${survey.id}`}>Edit</Link>
                </Button>
              </div>
              <DeleteSurveyButton surveyId={survey.id}>
                <Trash2 className="h-4 w-4" />
              </DeleteSurveyButton>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function EditorPage() {
  return (
    <div className="container flex flex-col gap-6 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">My Surveys</h1>
          <p className="text-muted-foreground mt-2">Create and manage your surveys</p>
        </div>
        <CreateSurveyDropdown />
      </div>
      <React.Suspense fallback={<SurveyListSkeleton />}>
        <SurveyList />
      </React.Suspense>
    </div>
  );
}