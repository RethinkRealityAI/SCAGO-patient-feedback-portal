import type { Metadata } from 'next';
import FeedbackForm from '@/components/feedback-form';
import { getSurvey } from '@/app/editor/actions';
import { ensureContactForm } from '@/lib/ensure-contact-form';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

/**
 * A form on its own, for embedding in another site with an <iframe>.
 * No site chrome or page padding; the form reports its height to the host
 * page (see FeedbackForm) so the frame can grow to fit it.
 *
 *   https://<portal>/embed/<survey id or slug>
 *
 * `?lang=fr` starts the form in French and `?lang=en` in English; either one
 * also hides the form's own language switch, since the host page has already
 * chosen the language (e.g. the website's /fr pages). Without it the visitor
 * can switch languages in the form as usual.
 */
type EmbedPageProps = {
  params: Promise<{ surveyId: string }>;
  searchParams: Promise<{ lang?: string | string[] }>;
};

export const metadata: Metadata = {
  robots: { index: false },
};

export default async function EmbedSurveyPage({ params, searchParams }: EmbedPageProps) {
  const { surveyId } = await params;
  const { lang: langParam } = await searchParams;
  const rawLang = (Array.isArray(langParam) ? langParam[0] : langParam)?.toLowerCase();
  const lang = rawLang?.startsWith('fr') ? 'fr' : rawLang?.startsWith('en') ? 'en' : undefined;
  await ensureContactForm(surveyId);
  const surveyData = await getSurvey(surveyId);

  return (
    // Measured by FeedbackForm to size the iframe; must not have a min-height.
    <div id="scago-embed-root" className="w-full min-w-0 px-1 py-2 sm:px-2">
      {'error' in surveyData ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{lang === 'fr' ? 'Impossible de charger le formulaire' : 'Error Loading Form'}</AlertTitle>
          <AlertDescription>
            {lang === 'fr'
              ? 'Ce formulaire ne peut pas être chargé. Veuillez réessayer plus tard.'
              : 'This form could not be loaded. Please try again later.'}
          </AlertDescription>
        </Alert>
      ) : (
        <FeedbackForm
          survey={surveyData as any}
          embedded
          initialLanguage={lang ?? 'en'}
          hideLanguageToggle={lang !== undefined}
        />
      )}
    </div>
  );
}
