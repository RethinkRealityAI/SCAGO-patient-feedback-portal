import { Suspense } from 'react'
import { getSubmissionsForSurvey, analyzeFeedbackForSurvey } from '../actions'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle, Loader } from 'lucide-react'
import ReactMarkdown from 'react-markdown'

export default async function SurveyDashboardPage({ params }: { params: { surveyId: string } }) {
  const { surveyId } = await params
  const submissionsOrError = await getSubmissionsForSurvey(surveyId)

  if ('error' in submissionsOrError) {
    return (
      <div className="container max-w-2xl py-8 text-center">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Dashboard</AlertTitle>
          <AlertDescription>
            <p className="mb-2">{submissionsOrError.error}</p>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const analysis = await analyzeFeedbackForSurvey(surveyId)

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid gap-8">
        <Card>
          <CardHeader>
            <CardTitle>AI Analysis</CardTitle>
            <CardDescription>Summary of insights for this survey.</CardDescription>
          </CardHeader>
          <CardContent>
            {'error' in analysis ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Analysis Error</AlertTitle>
                <AlertDescription>{analysis.error}</AlertDescription>
              </Alert>
            ) : (
              <div className="prose rounded-lg border bg-gray-50 p-4">
                <ReactMarkdown>{analysis.summary as string}</ReactMarkdown>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Submissions</CardTitle>
            <CardDescription>Latest responses for this survey.</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Total: {submissionsOrError.length}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


