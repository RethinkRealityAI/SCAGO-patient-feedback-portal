import React from 'react';
import { CreateSurveyDropdown } from './client';
import { SurveyListClient } from './survey-list-client';
import { listSurveys } from './actions';
import { UserInfoHeader } from '@/components/user-info-header';

// Force dynamic rendering and disable caching for this page
export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function SurveyList() {
  const surveys = await listSurveys();
  return <SurveyListClient initialSurveys={surveys} />;
}

export default function EditorPage() {
  return (
    <div className="container flex flex-col gap-6 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">My Surveys</h1>
          <p className="text-muted-foreground mt-2">Create and manage your surveys</p>
        </div>
        <div className="flex items-center gap-3">
          <UserInfoHeader />
          <CreateSurveyDropdown />
        </div>
      </div>
      <React.Suspense fallback={<div>Loading surveys...</div>}>
        <SurveyList />
      </React.Suspense>
    </div>
  );
}