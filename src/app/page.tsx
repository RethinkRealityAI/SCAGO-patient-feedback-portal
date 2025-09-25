import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { getSurveys } from './actions';
import { ArrowRight, FileText } from 'lucide-react';

export default async function SurveysPage() {
  const surveys = await getSurveys();

  return (
    <div className="bg-muted/20 flex-1">
      <div className="container max-w-5xl py-8 md:py-12">
        <header className="mb-8 flex items-center justify-between">
          <div className="flex-1">
            <h1 className="scroll-m-20 text-4xl font-bold tracking-tight text-primary lg:text-5xl font-headline">
              Available Surveys
            </h1>
            <p className="mt-2 text-lg text-muted-foreground">
              Select a survey to provide your feedback.
            </p>
          </div>
        </header>

        <div className="grid gap-4 md:gap-8">
          {surveys.length > 0 ? (
            surveys.map((survey) => (
              <Card
                key={survey.id}
                className="transition-all duration-300 ease-out hover:shadow-xl hover:-translate-y-1"
              >
                <Link
                  href={`/survey/${survey.id}`}
                  className="block p-6"
                  title={`Begin ${survey.title}`}
                >
                  <CardHeader className="p-0">
                    <CardTitle className="flex items-center gap-3">
                      <FileText className="h-6 w-6 text-primary" />
                      {survey.title}
                    </CardTitle>
                    <CardDescription className="pt-2 pl-[36px]">
                      {survey.description}
                    </CardDescription>
                  </CardHeader>
                </Link>
              </Card>
            ))
          ) : (
            <Card className="flex flex-col items-center justify-center p-12 text-center">
              <CardTitle className="text-2xl font-bold">
                No Surveys Available
              </CardTitle>
              <CardDescription className="mt-2">
                There are currently no surveys to display. Please check back
                later.
              </CardDescription>
              <Button asChild className="mt-6">
                <Link href="/editor">
                  Go to Editor <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
