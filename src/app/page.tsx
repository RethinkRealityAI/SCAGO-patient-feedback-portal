import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

const surveys = [
  {
    id: 'main-feedback',
    title: 'Patient Care Feedback',
    description: 'Share your experience with the Ontario healthcare system to help us advocate for better care for individuals with Sickle Cell Disease.',
  },
  // New surveys will appear here in the future
];

export default function Home() {
  return (
    <div className="container max-w-4xl py-8 md:py-12">
      <section className="text-center mb-12">
        <h1 className="scroll-m-20 text-4xl font-bold tracking-tight text-primary lg:text-5xl font-headline">
          Share Your Feedback
        </h1>
        <p className="mt-4 max-w-3xl mx-auto text-lg text-muted-foreground">
          Your voice matters. The information collected on this portal will be used to advance advocacy and education in improving the quality of care delivered to peers with SCD in Ontario.
        </p>
      </section>

      <section className="grid gap-8 md:grid-cols-1">
        {surveys.map((survey) => (
          <Card key={survey.id} className="flex flex-col">
            <CardHeader>
              <CardTitle>{survey.title}</CardTitle>
              <CardDescription>{survey.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow"></CardContent>
            <CardFooter>
              <Button asChild className="w-full sm:w-auto">
                <Link href={`/survey/${survey.id}`}>
                  Go to Survey <ArrowRight className="ml-2" />
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </section>
    </div>
  );
}
