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
      <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-2xl">
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
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-5xl">
        <FeedbackForm survey={surveyData as any} />
      </div>
    </div>
  )
}
