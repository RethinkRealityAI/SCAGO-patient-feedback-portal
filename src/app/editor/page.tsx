import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardDescription,
  CardTitle,
} from '@/components/ui/card';
import { listSurveys } from './actions';
import { CreateSurveyButton, DeleteSurveyButton } from './client';
import { ArrowLeft, FileEdit } from 'lucide-react';

export default async function EditorPage() {
  const surveys = await listSurveys();

  return (
    <div className="container max-w-5xl py-8 md:py-12">
      <header className="mb-8 flex items-center justify-between">
        <div className="flex-1">
          <Button asChild variant="outline" size="sm" className="mb-4">
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Surveys
            </Link>
          </Button>
          <h1 className="scroll-m-20 text-4xl font-bold tracking-tight text-primary lg:text-5xl font-headline">
            Survey Editor
          </h1>
          <p className="mt-2 text-lg text-muted-foreground">
            Create, manage, and edit your feedback surveys.
          </p>
        </div>
        <CreateSurveyButton />
      </header>

      <div className="grid gap-4 md:gap-8">
        {surveys.length === 0 && (
          <Card className="flex flex-col items-center justify-center p-12 text-center">
            <CardTitle className="text-2xl font-bold">
              No Surveys Found
            </CardTitle>
            <CardDescription className="mt-2">
              Get started by creating a new survey.
            </CardDescription>
          </Card>
        )}
        {surveys.map((survey) => (
          <Card key={survey.id}>
            <div className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between">
              <div className="flex-1 mb-4 sm:mb-0">
                <CardTitle>{survey.title}</CardTitle>
                <CardDescription className="mt-2">
                  {survey.description}
                </CardDescription>
                <p className="text-sm text-muted-foreground mt-2">
                  ID: {survey.id}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button asChild>
                  <Link href={`/editor/${survey.id}`}>
                    <FileEdit className="mr-2 h-4 w-4" /> Edit
                  </Link>
                </Button>
                <DeleteSurveyButton id={survey.id} />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
