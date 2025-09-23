import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileEdit, PlusCircle } from 'lucide-react'
import Link from 'next/link'

// This data will eventually be fetched from a 'surveys' collection list
const surveys = [
  {
    id: 'main-feedback',
    title: 'Patient Care Feedback',
    description: 'The primary feedback form for patient hospital experiences.',
  },
]

export default function EditorPage() {
  return (
    <div className="container max-w-7xl py-8 md:py-12">
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

      <div className="grid gap-6">
        {surveys.map((survey) => (
          <Card key={survey.id}>
            <CardHeader>
              <CardTitle>{survey.title}</CardTitle>
              <CardDescription>{survey.description}</CardDescription>
            </CardHeader>
            <CardContent>
              {/* The submission count was causing permission errors and is not needed here. */}
            </CardContent>
            <CardFooter>
              <Button asChild variant="outline">
                <Link href={`/editor/${survey.id}`}>
                  <FileEdit className="mr-2" />
                  Edit Survey
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
}
