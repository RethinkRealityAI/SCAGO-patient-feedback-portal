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
    <div className="flex-1 min-h-screen">
      <div className="container max-w-4xl py-6 px-4 sm:py-8 sm:px-6 lg:py-12 mx-auto">
        <header className="mb-8 sm:mb-12">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-primary/10 backdrop-blur-sm border border-primary/20 mb-6">
              <FileText className="h-8 w-8 text-primary" />
            </div>
            <h1 className="scroll-m-20 text-3xl font-bold tracking-tight text-primary sm:text-4xl lg:text-5xl font-headline">
              Available Surveys
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
              Select a survey to provide your feedback and help us improve healthcare services.
            </p>
          </div>
        </header>

        <div className="space-y-4 sm:space-y-6">
          {surveys.length > 0 ? (
            surveys.map((survey, index) => (
              <Card
                key={survey.id}
                className="group hover:-translate-y-2 hover:scale-[1.02] transition-all duration-500 ease-out animate-float"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <Link
                  href={`/survey/${survey.id}`}
                  className="block p-6 sm:p-8"
                  title={`Begin ${survey.title}`}
                >
                  <CardHeader className="p-0">
                    <CardTitle className="flex items-center gap-4 text-lg sm:text-xl lg:text-2xl group-hover:text-primary transition-colors duration-300">
                      <div className="p-3 rounded-xl bg-primary/10 backdrop-blur-sm border border-primary/20 group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300 shrink-0">
                        <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold leading-tight break-words">
                          {survey.title}
                        </div>
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all duration-300 shrink-0" />
                    </CardTitle>
                  </CardHeader>
                </Link>
              </Card>
            ))
          ) : (
            <Card className="flex flex-col items-center justify-center p-8 sm:p-12 lg:p-16 text-center animate-float">
              <div className="p-4 rounded-2xl bg-muted/20 backdrop-blur-sm border border-muted/30 mb-6">
                <FileText className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground" />
              </div>
              <CardTitle className="text-xl sm:text-2xl lg:text-3xl font-bold mb-4">
                No Surveys Available
              </CardTitle>
              <CardDescription className="text-base sm:text-lg mb-8 max-w-md">
                There are currently no surveys to display. Please check back
                later or create a new survey.
              </CardDescription>
              <Button asChild size="lg" className="group">
                <Link href="/editor">
                  Go to Editor 
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />
                </Link>
              </Button>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
