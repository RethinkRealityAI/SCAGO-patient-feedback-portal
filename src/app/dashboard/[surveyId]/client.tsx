'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle, Loader, RefreshCw, ArrowLeft } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { collection, getDocs, orderBy, query } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { FeedbackSubmission } from '../types'
import { analyzeFeedbackForSurvey } from '../actions'
import Link from 'next/link'

export default function SurveyDashboardClient({ surveyId }: { surveyId: string }) {
  const [submissions, setSubmissions] = useState<FeedbackSubmission[]>([])
  const [analysis, setAnalysis] = useState<{ summary?: string; error?: string } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true)
        setError(null)

        // Fetch submissions directly from Firestore
        const feedbackCol = collection(db, 'feedback')
        const q = query(feedbackCol, orderBy('submittedAt', 'desc'))
        const feedbackSnapshot = await getDocs(q)
        const allSubmissions = feedbackSnapshot.docs.map(doc => {
          const data = doc.data()
          const raw = data.submittedAt as any
          const date = raw && typeof raw.toDate === 'function' ? raw.toDate() : (raw instanceof Date ? raw : (typeof raw === 'string' || typeof raw === 'number' ? new Date(raw) : new Date()))
          return {
            id: doc.id,
            ...data,
            rating: Number(data.rating),
            submittedAt: date,
          } as FeedbackSubmission
        })

        // Filter for this survey
        const filteredSubmissions = allSubmissions.filter(s => (s as any).surveyId === surveyId)
        setSubmissions(filteredSubmissions)

        // Run analysis
        setIsAnalyzing(true)
        const analysisResult = await analyzeFeedbackForSurvey(surveyId)
        setAnalysis(analysisResult)
        setIsAnalyzing(false)
      } catch (e: any) {
        console.error("Error fetching survey data:", e)
        if (e.code === 'permission-denied') {
          setError('You do not have permission to view this data. Please ensure you are logged in as an admin.')
        } else {
          setError('Failed to load survey data. Please try refreshing the page.')
        }
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [surveyId])

  // Show loading state
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
          <Loader className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading survey dashboard...</p>
        </div>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Dashboard</AlertTitle>
          <AlertDescription>
            <p className="mb-2">{error}</p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => window.location.reload()}
              className="mt-2"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // Calculate metrics
  const totalSubmissions = submissions.length
  const avgRating = totalSubmissions > 0 
    ? (submissions.reduce((acc, s) => acc + Number(s.rating || 0), 0) / totalSubmissions).toFixed(1)
    : '0.0'
  const excellent = submissions.filter(s => s.rating >= 8).length
  const good = submissions.filter(s => s.rating >= 5 && s.rating < 8).length
  const needsImprovement = submissions.filter(s => s.rating < 5).length
  
  // Get hospital breakdown
  const hospitalName = (submissions[0] as any)?.hospital || 
                      (submissions[0] as any)?.['hospital-on']?.selection || 
                      'Hospital'

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid gap-8">
        {/* Header with Survey ID and Back Button */}
        <div className="space-y-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to All Surveys
            </Button>
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Survey Dashboard</h1>
              <p className="text-muted-foreground mt-1">Survey ID: {surveyId}</p>
            </div>
          </div>
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
            {isAnalyzing ? (
              <div className="flex items-center justify-center py-8 space-x-2">
                <Loader className="h-5 w-5 animate-spin" />
                <span className="text-sm text-muted-foreground">Analyzing feedback...</span>
              </div>
            ) : analysis && 'error' in analysis ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Analysis Error</AlertTitle>
                <AlertDescription>{analysis.error}</AlertDescription>
              </Alert>
            ) : analysis && 'summary' in analysis ? (
              <div className="prose prose-sm max-w-none rounded-lg border bg-gradient-to-br from-primary/5 to-transparent p-6">
                <ReactMarkdown>{analysis.summary as string}</ReactMarkdown>
              </div>
            ) : null}
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
            {totalSubmissions === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No submissions found for this survey.
              </div>
            ) : (
              <>
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
                      {submissions.slice(0, 10).map((submission) => (
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
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

