import FeedbackForm from '@/components/feedback-form'
import { getSurvey } from '@/app/editor/actions';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

type SurveyPageProps = {
  params: {
    surveyId: string;
  };
};

export default async function SurveyPage({ params }: SurveyPageProps) {
  const { surveyId } = await params;
  const surveyData = await getSurvey(surveyId);

  if ('error' in surveyData) {
    return (
      <div className="container max-w-2xl py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Form</AlertTitle>
          <AlertDescription>
            <p className="mb-2">{surveyData.error}</p>
             <p className="text-xs">
                There was a problem loading the survey configuration. Please try again later.
             </p>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8 md:py-12">
      <section className="text-center">
        <h1 className="scroll-m-20 text-4xl font-bold tracking-tight text-primary lg:text-5xl font-headline">
          {surveyData.title}
        </h1>
        <p className="mt-4 text-lg text-muted-foreground whitespace-pre-wrap">
          {surveyData.description}
        </p>
      </section>

      <section className="mt-12">
        <FeedbackForm survey={surveyData as any} />
      </section>
    </div>
  )
}
