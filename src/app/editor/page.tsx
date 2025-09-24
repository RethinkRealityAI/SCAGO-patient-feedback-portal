import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { PlusCircle } from 'lucide-react';

// For now, we'll just have a link to a single, hard-coded survey editor.
// In a future version, this page could list all available surveys.
const surveys = [
    {
        id: 'main-feedback-survey',
        title: 'Patient Feedback Survey',
        description: 'The main feedback survey for the patient portal.'
    }
]

export default function EditorPage() {
  return (
    <div className="container max-w-5xl py-8 md:py-12">
      <header className="mb-8 flex items-center justify-between">
        <div className="flex-1">
          <h1 className="scroll-m-20 text-4xl font-bold tracking-tight text-primary lg:text-5xl font-headline">
            Survey Editor
          </h1>
          <p className="mt-2 text-lg text-muted-foreground">
            Manage your feedback surveys from here.
          </p>
        </div>
        <Button disabled>
          <PlusCircle className="mr-2" />
          Create New Survey
        </Button>
      </header>

      <div className="grid gap-4 md:gap-8">
        {surveys.map((survey) => (
          <Card key={survey.id}>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>{survey.title}</CardTitle>
                    <CardDescription>{survey.description}</CardDescription>
                </div>
                 <Button asChild size="sm">
                    <Link href={`/editor/${survey.id}`}>Edit Survey</Link>
                </Button>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}
