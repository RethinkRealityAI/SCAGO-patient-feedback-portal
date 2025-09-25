'use client';
import React from 'react';
import { Button } from '@/components/ui/button';
import { db } from '@/lib/firebase';
import Link from 'next/link';
import { CreateSurveyButton, DeleteSurveyButton } from './client';
import { Skeleton } from '@/components/ui/skeleton';
import { Trash2 } from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';

function SurveyListSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-between rounded-lg border p-4"
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
  const surveys = await getDocs(collection(db, 'surveys'));

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
      {surveys.docs.map((doc: { data: () => any; id: React.Key | null | undefined; }) => {
        const survey = doc.data();
        return (
          <div
            key={doc.id}
            className="flex items-center justify-between rounded-lg border p-4"
          >
            <div>
              <h2 className="text-lg font-semibold">{survey.name}</h2>
              <p className="text-sm text-gray-500">
                {survey.questions.length} questions
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button asChild>
                <Link href={`/editor/${doc.id}`}>Edit</Link>
              </Button>
              <DeleteSurveyButton surveyId={doc.id as string}>
                <Trash2 className="h-4 w-4" />
              </DeleteSurveyButton>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function EditorPage() {
  return (
    <div className="container flex flex-col gap-4 py-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Surveys</h1>
        <CreateSurveyButton />
      </div>
      <React.Suspense fallback={<SurveyListSkeleton />}>
        <SurveyList />
      </React.Suspense>
    </div>
  );
}
