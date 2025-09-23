import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileEdit, PlusCircle } from 'lucide-react'
import Link from 'next/link'

// Placeholder data - in the future, this will be fetched from Firestore
const surveys = [
  {
    id: 'main-feedback',
    title: 'Patient Care Feedback',
    description: 'The primary feedback form for patient hospital experiences.',
    submissionCount: 128, // Example data
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
              <p className="text-sm text-muted-foreground">
                {survey.submissionCount} submissions
              </p>
            </CardContent>
            <CardFooter>
              <Button asChild variant="outline" disabled>
                <Link href={`/editor/${survey.id}`}>
                  <FileEdit className="mr-2" />
                  Edit Survey
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

       <Card className="mt-8">
        <CardHeader>
          <CardTitle>Full Editor Coming Soon!</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center text-center text-muted-foreground p-8 border-2 border-dashed border-border rounded-lg">
            <FileEdit className="h-12 w-12 mb-4" />
            <p>
              Soon, you'll be able to design your forms with custom questions, logic, and more right from this page. For now, the forms are rendered based on data in the 'surveys' collection in Firestore.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
