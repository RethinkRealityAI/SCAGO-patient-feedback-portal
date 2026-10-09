import type { Metadata } from 'next';
import FeedbackForm from '@/components/feedback-form';
import { getSurvey } from '@/app/editor/actions';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

/**
 * A form on its own, for embedding in another site with an <iframe>.
 * No site chrome or page padding; the form reports its height to the host
 * page (see FeedbackForm) so the frame can grow to fit it.
 *
 *   https://<portal>/embed/<survey id or slug>
 */
type EmbedPageProps = {
  params: Promise<{ surveyId: string }>;
};

export const metadata: Metadata = {
  robots: { index: false },
};

export default async function EmbedSurveyPage({ params }: EmbedPageProps) {
  const { surveyId } = await params;
  const surveyData = await getSurvey(surveyId);

  return (
    // Measured by FeedbackForm to size the iframe; must not have a min-height.
    <div id="scago-embed-root" className="w-full min-w-0 px-1 py-2 sm:px-2">
      {'error' in surveyData ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Form</AlertTitle>
          <AlertDescription>This form could not be loaded. Please try again later.</AlertDescription>
        </Alert>
      ) : (
        <FeedbackForm survey={surveyData as any} embedded />
      )}
    </div>
  );
}
