'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { DeleteSurveyButton } from './client';
import { Skeleton } from '@/components/ui/skeleton';
import { Trash2 } from 'lucide-react';
import { listSurveys } from './actions';

interface Survey {
  id: string;
  name?: string;
  title?: string;
  sections?: Array<{
    fields?: Array<any>;
  }>;
}

interface SurveyListClientProps {
  initialSurveys: Survey[];
}

export function SurveyListClient({ initialSurveys }: SurveyListClientProps) {
  const [surveys, setSurveys] = useState<Survey[]>(initialSurveys);
  const [isLoading, setIsLoading] = useState(false);

  // Function to refresh the survey list
  const refreshSurveys = async () => {
    setIsLoading(true);
    try {
      const updatedSurveys = await listSurveys();
      setSurveys(updatedSurveys);
    } catch (error) {
      console.error('Failed to refresh surveys:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to handle survey deletion with optimistic updates
  const handleSurveyDelete = (surveyId: string) => {
    // Optimistically remove the survey from the UI
    setSurveys(prevSurveys => prevSurveys.filter(survey => survey.id !== surveyId));
  };

  // Function to handle deletion error (restore the survey if deletion failed)
  const handleDeletionError = (surveyId: string, originalSurvey: Survey) => {
    // Restore the survey if deletion failed
    setSurveys(prevSurveys => [...prevSurveys, originalSurvey].sort((a, b) => 
      (a.name || a.title || '').localeCompare(b.name || b.title || '')
    ));
  };

  if (isLoading) {
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

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
      {surveys.map((survey) => (
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
              <DeleteSurveyButton 
                surveyId={survey.id}
                onDelete={handleSurveyDelete}
                onError={handleDeletionError}
                originalSurvey={survey}
              >
                <Trash2 className="h-4 w-4" />
              </DeleteSurveyButton>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}














