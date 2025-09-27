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

  // Calculate metrics
  const totalSubmissions = submissionsOrError.length
  const avgRating = totalSubmissions > 0 
    ? (submissionsOrError.reduce((acc, s) => acc + Number(s.rating || 0), 0) / totalSubmissions).toFixed(1)
    : '0.0'
  const excellent = submissionsOrError.filter(s => s.rating >= 8).length
  const good = submissionsOrError.filter(s => s.rating >= 5 && s.rating < 8).length
  const needsImprovement = submissionsOrError.filter(s => s.rating < 5).length
  
  // Get hospital breakdown
  const hospitalName = (submissionsOrError[0] as any)?.hospital || 
                      (submissionsOrError[0] as any)?.['hospital-on']?.selection || 
                      'Hospital'

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid gap-8">
        {/* Header with Survey ID */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Survey Dashboard</h1>
            <p className="text-muted-foreground mt-1">Survey ID: {surveyId}</p>
          </div>
          <Button asChild>
            <a href="/dashboard">View All Surveys</a>
          </Button>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Total Submissions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalSubmissions}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Average Rating</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgRating}/10</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Hospital</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm font-bold truncate">{hospitalName}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Experience Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 text-xs">
                <span className="text-green-600">E: {excellent}</span>
                <span className="text-yellow-600">G: {good}</span>
                <span className="text-red-600">NI: {needsImprovement}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* AI Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>AI Analysis Summary</CardTitle>
            <CardDescription>
              AI-powered insights and recommendations for this survey
            </CardDescription>
          </CardHeader>
          <CardContent>
            {'error' in analysis ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Analysis Error</AlertTitle>
                <AlertDescription>{analysis.error}</AlertDescription>
              </Alert>
            ) : (
              <div className="prose prose-sm max-w-none rounded-lg border bg-gradient-to-br from-primary/5 to-transparent p-6">
                <ReactMarkdown>{analysis.summary as string}</ReactMarkdown>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submissions Table */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Submissions</CardTitle>
            <CardDescription>
              Individual feedback responses for this survey
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium">Date</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Rating</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Experience</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Sentiment</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {submissionsOrError.slice(0, 10).map((submission) => (
                    <tr key={submission.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3 text-sm">
                        {new Date(submission.submittedAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-medium">{submission.rating}/10</span>
                          <div className={`h-2 w-2 rounded-full ${
                            submission.rating >= 9 ? 'bg-green-500' :
                            submission.rating >= 7 ? 'bg-yellow-500' : 'bg-red-500'
                          }`} />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm max-w-md">
                        <p className="line-clamp-2">{submission.hospitalInteraction}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                          submission.rating >= 8 ? 'bg-green-100 text-green-700' :
                          submission.rating >= 5 ? 'bg-yellow-100 text-yellow-700' : 
                          'bg-red-100 text-red-700'
                        }`}>
                          {submission.rating >= 8 ? 'Excellent' :
                           submission.rating >= 5 ? 'Good' : 'Needs Improvement'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalSubmissions > 10 && (
              <p className="mt-4 text-sm text-muted-foreground text-center">
                Showing 10 of {totalSubmissions} submissions
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


