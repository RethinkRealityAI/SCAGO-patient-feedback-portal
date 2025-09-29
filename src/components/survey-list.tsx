'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ArrowRight, FileText, Languages } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface Survey {
  id: string;
  title: string;
  description: string;
}

interface SurveyListProps {
  surveys: Survey[];
}

// French translations
const translations = {
  en: {
    title: 'Available Surveys',
    description: 'Select a survey to provide your feedback and help us improve healthcare services.',
    noSurveys: 'No Surveys Available',
    noSurveysDescription: 'There are currently no surveys to display. Please check back later or create a new survey.',
    goToEditor: 'Go to Editor',
    beginSurvey: 'Begin',
    language: 'Language',
    english: 'English',
    french: 'Français'
  },
  fr: {
    title: 'Sondages Disponibles',
    description: 'Sélectionnez un sondage pour fournir vos commentaires et nous aider à améliorer les services de santé.',
    noSurveys: 'Aucun Sondage Disponible',
    noSurveysDescription: 'Il n\'y a actuellement aucun sondage à afficher. Veuillez revenir plus tard ou créer un nouveau sondage.',
    goToEditor: 'Aller à l\'Éditeur',
    beginSurvey: 'Commencer',
    language: 'Langue',
    english: 'English',
    french: 'Français'
  }
};

export default function SurveyList({ surveys }: SurveyListProps) {
  const [isFrench, setIsFrench] = useState(false);
  const t = translations[isFrench ? 'fr' : 'en'];

  return (
    <div className="flex-1 min-h-screen">
      <div className="w-full max-w-none py-4 px-2 sm:py-6 sm:px-4 lg:py-8 mx-auto">
        <header className="mb-6 sm:mb-8">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-primary/10 backdrop-blur-sm border border-primary/20 mb-6">
              <FileText className="h-8 w-8 text-primary" />
            </div>
            <h1 className="scroll-m-20 text-2xl font-bold tracking-tight text-primary sm:text-3xl lg:text-4xl font-headline">
              {t.title}
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
              {t.description}
            </p>
            
            {/* Language Toggle */}
            <div className="flex items-center justify-center gap-3 mt-6 p-3 rounded-lg bg-muted/20 backdrop-blur-sm border border-muted/30 max-w-xs mx-auto">
              <Languages className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="language-toggle" className="text-sm font-medium">
                {t.language}:
              </Label>
              <div className="flex items-center gap-2">
                <span className={`text-xs ${!isFrench ? 'font-semibold text-primary' : 'text-muted-foreground'}`}>
                  {t.english}
                </span>
                <Switch
                  id="language-toggle"
                  checked={isFrench}
                  onCheckedChange={setIsFrench}
                />
                <span className={`text-xs ${isFrench ? 'font-semibold text-primary' : 'text-muted-foreground'}`}>
                  {t.french}
                </span>
              </div>
            </div>
          </div>
        </header>

        <div className="space-y-3 sm:space-y-4">
          {surveys.length > 0 ? (
            surveys.map((survey, index) => (
              <div
                key={survey.id}
                className="group hover:-translate-y-1 hover:scale-[1.01] transition-all duration-300 ease-out"
              >
                <Link
                  href={`/survey/${survey.id}`}
                  className="block p-4 sm:p-6 rounded-lg border bg-card text-card-foreground shadow-sm hover:shadow-md transition-shadow duration-300"
                  title={`${t.beginSurvey} ${survey.title}`}
                >
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="p-2 sm:p-3 rounded-xl bg-primary/10 backdrop-blur-sm border border-primary/20 group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300 shrink-0">
                      <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-base sm:text-lg lg:text-xl leading-tight break-words group-hover:text-primary transition-colors duration-300">
                        {survey.title}
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all duration-300 shrink-0" />
                  </div>
                </Link>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center p-6 sm:p-8 lg:p-12 text-center rounded-lg border bg-card text-card-foreground shadow-sm">
              <div className="p-4 rounded-2xl bg-muted/20 backdrop-blur-sm border border-muted/30 mb-6">
                <FileText className="h-8 w-8 sm:h-12 sm:w-12 text-muted-foreground" />
              </div>
              <h2 className="text-lg sm:text-xl lg:text-2xl font-bold mb-4">
                {t.noSurveys}
              </h2>
              <p className="text-sm sm:text-base mb-6 max-w-md text-muted-foreground">
                {t.noSurveysDescription}
              </p>
              <Button asChild size="lg" className="group">
                <Link href="/editor">
                  {t.goToEditor}
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />
                </Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
