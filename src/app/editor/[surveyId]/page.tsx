import SurveyEditor from '@/components/survey-editor';
import { getSurvey } from '../actions';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

type SurveyEditorPageProps = {
  params: {
    surveyId: string;
  };
};

export default async function SurveyEditorPage({
  params,
}: SurveyEditorPageProps) {
  const { surveyId } = params;
  const surveyData = await getSurvey(surveyId);

  if ('error' in surveyData) {
    return (
      <div className="container max-w-2xl py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Survey</AlertTitle>
          <AlertDescription>
            <p className="mb-2">{surveyData.error}</p>
             <p className="text-xs">
                Please ensure your Firestore security rules allow reads on the 'surveys' collection for this document.
             </p>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container max-w-5xl py-8 md:py-12">
      <header className="mb-8">
        <h1 className="scroll-m-20 text-4xl font-bold tracking-tight text-primary lg:text-5xl font-headline">
          Editing: {surveyData.title}
        </h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Modify sections, questions, and settings for this survey.
        </p>
      </header>

      <SurveyEditor survey={surveyData} />
    </div>
  );
}
