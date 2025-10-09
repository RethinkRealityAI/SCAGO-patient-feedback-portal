import React from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { CreateYEPFormDropdown, DeleteYEPFormButton } from './client';
import { Skeleton } from '@/components/ui/skeleton';
import { Trash2, FileText, Users, Calendar, ClipboardList, UserCheck, UserPlus } from 'lucide-react';
import { getYEPFormTemplates } from './actions';
import { YEPFormCategory } from '@/lib/yep-forms-types';

function YEPFormListSkeleton() {
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

function getCategoryIcon(category: YEPFormCategory) {
  switch (category) {
    case YEPFormCategory.MENTOR:
      return <UserCheck className="h-5 w-5" />;
    case YEPFormCategory.PARTICIPANT:
      return <UserPlus className="h-5 w-5" />;
    case YEPFormCategory.WORKSHOP:
      return <Calendar className="h-5 w-5" />;
    case YEPFormCategory.MEETING:
      return <Users className="h-5 w-5" />;
    case YEPFormCategory.ATTENDANCE:
    case YEPFormCategory.BULK_ATTENDANCE:
      return <ClipboardList className="h-5 w-5" />;
    case YEPFormCategory.BULK_MEETING:
      return <Users className="h-5 w-5" />;
    default:
      return <FileText className="h-5 w-5" />;
  }
}

function getCategoryLabel(category: YEPFormCategory) {
  switch (category) {
    case YEPFormCategory.MENTOR:
      return 'Mentor';
    case YEPFormCategory.PARTICIPANT:
      return 'Participant';
    case YEPFormCategory.WORKSHOP:
      return 'Workshop';
    case YEPFormCategory.MEETING:
      return 'Meeting';
    case YEPFormCategory.ATTENDANCE:
      return 'Attendance';
    case YEPFormCategory.BULK_ATTENDANCE:
      return 'Bulk Attendance';
    case YEPFormCategory.BULK_MEETING:
      return 'Bulk Meeting';
    default:
      return 'Form';
  }
}

async function YEPFormList() {
  const result = await getYEPFormTemplates();
  const forms = result.success ? result.data : [];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
      {forms.map((form: any) => (
        <div
          key={form.id}
          className="glass-card p-6 group hover:-translate-y-1 transition-all duration-300 hover:shadow-lg"
        >
          <div className="flex flex-col space-y-4">
            {/* Header with title and category */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {getCategoryIcon(form.category)}
                <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded">
                  {getCategoryLabel(form.category)}
                </span>
              </div>
              <h2 className="text-xl font-bold group-hover:text-primary transition-colors leading-tight">
                {form.name}
              </h2>
              <p className="text-sm text-muted-foreground">
                {form.description || 'No description provided'}
              </p>
            </div>
            
            {/* Form stats */}
            <div className="text-sm text-muted-foreground">
              {(form.sections?.reduce((sum: number, section: any) => sum + (section.fields?.length || 0), 0)) ?? 0} fields
            </div>
            
            {/* Action buttons */}
            <div className="flex items-center justify-between pt-2 border-t border-border/50">
              <div className="flex items-center gap-2">
                <Button asChild size="sm" variant="outline" className="h-8">
                  <Link href={`/yep-forms/submit/${form.id}`}>Use Form</Link>
                </Button>
                <Button asChild size="sm" variant="secondary" className="h-8">
                  <Link href={`/yep-forms/editor/${form.id}`}>Edit</Link>
                </Button>
              </div>
              <DeleteYEPFormButton formId={form.id}>
                <Trash2 className="h-4 w-4" />
              </DeleteYEPFormButton>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function YEPFormsPage() {
  return (
    <div className="container flex flex-col gap-6 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">YEP Forms</h1>
          <p className="text-muted-foreground mt-2">Create and manage forms for the Youth Empowerment Program</p>
        </div>
        <CreateYEPFormDropdown />
      </div>
      <React.Suspense fallback={<YEPFormListSkeleton />}>
        <YEPFormList />
      </React.Suspense>
    </div>
  );
}
