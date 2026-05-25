'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle, Loader, RefreshCw, ArrowLeft } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
// Firestore imports removed - now using utility functions from @/lib/submission-utils
import { FeedbackSubmission } from '../types'
import { analyzeFeedbackForSurvey } from '../actions'
import { getSurvey } from '@/app/editor/actions'
import { DashboardWidgets, type DashboardWidget } from '@/components/dashboard-widgets'
import { useAuth } from '@/hooks/use-auth'
import Link from 'next/link'

// Helper function to safely extract a string value from a field
// The field might be: a string, an object with .selection, or something else entirely
function extractStringValue(value: any): string | null {
  if (typeof value === 'string' && value.trim()) {
    return value.trim()
  }
  if (value && typeof value === 'object') {
    // Check for .selection property (common pattern in survey data)
    if (typeof value.selection === 'string' && value.selection.trim()) {
      return value.selection.trim()
    }
    // Check for .value property (another common pattern)
    if (typeof value.value === 'string' && value.value.trim()) {
      return value.value.trim()
    }
  }
  return null
}

// Helper function to extract hospital name from a submission
// Handles multiple possible field name variations for consistent data access
// IMPORTANT: Always returns a string, never an object (fixes React error #31)
function getHospitalName(submission: any): string {
  return extractStringValue(submission.hospitalName) ||
    extractStringValue(submission.hospital) ||
    extractStringValue(submission['hospital-on']) ||
    'Hospital'
}

// Detect whether any submission in the set carries hospital-feedback fields.
// Used to decide whether to show hospital-specific metric cards.
function hasHospitalFields(submissions: FeedbackSubmission[]): boolean {
  return submissions.some(s =>
    s.rating !== undefined ||
    !!(s as any).hospitalInteraction ||
    !!(s as any).hospitalName ||
    !!(s as any)['hospital-on']
  )
}

interface DashboardColumn { fieldId: string; label: string }

export default function SurveyDashboardClient({ surveyId }: { surveyId: string }) {
  const { isAdmin, isSuperAdmin, allowedForms, loading: authLoading, permissionsLoading } = useAuth()
  const [submissions, setSubmissions] = useState<FeedbackSubmission[]>([])
  const [surveyConfig, setSurveyConfig] = useState<{ dashboardColumns?: DashboardColumn[]; dashboardWidgets?: DashboardWidget[]; title?: string } | null>(null)
  const [analysis, setAnalysis] = useState<{ summary?: string; error?: string } | null>(null)
  // isLoading covers only the initial data fetch (survey config + submissions).
  // isAnalyzing covers the separate AI analysis request that runs after data is loaded,
  // so the submissions table can render while analysis is still in progress.
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  useEffect(() => {
    // Wait for both auth AND permissions to settle before fetching.
    // Without this guard a restricted admin would briefly see isAdmin=true
    // with allowedForms=[] (before the async permissions fetch completes),
    // causing a false "permission denied" error.
    if (authLoading || permissionsLoading) return

    async function fetchData() {
      try {
        setIsLoading(true)
        setError(null)

        // ── Access control ────────────────────────────────────────────────────
        // Restricted admins (isAdmin && !isSuperAdmin) may only view surveys
        // listed in their allowedForms. Resolve the survey first so we have the
        // canonical Firestore document ID even if a slug was passed in the URL.
        const [surveyResult, { fetchSubmissionsForSurvey }] = await Promise.all([
          getSurvey(surveyId),
          import('@/lib/submission-utils'),
        ])

        // Resolve the canonical Firestore doc ID (getSurvey may resolve a slug)
        const resolvedId: string =
          !('error' in surveyResult) && (surveyResult as any).id
            ? (surveyResult as any).id
            : surveyId

        // Enforce per-survey access for restricted admins
        if (isAdmin && !isSuperAdmin) {
          const permitted = allowedForms ?? []
          if (!permitted.includes(resolvedId)) {
            setError('You do not have permission to view this survey\'s dashboard.')
            setIsLoading(false)
            return
          }
        }

        if (!('error' in surveyResult)) {
          setSurveyConfig(surveyResult as any)
        }

        // Use the resolved Firestore doc ID — never the raw URL param —
        // so submissions are always fetched from surveys/{docId}/submissions/
        const filteredSubmissions = await fetchSubmissionsForSurvey(resolvedId)
        setSubmissions(filteredSubmissions)

        // Stop the main loading spinner now — the submissions table can render.
        // AI analysis runs separately so the page isn't blocked waiting for it.
        setIsLoading(false)

        // Run analysis using the canonical ID
        setIsAnalyzing(true)
        const analysisResult = await analyzeFeedbackForSurvey(resolvedId)
        setAnalysis(analysisResult)
        setIsAnalyzing(false)
      } catch (e: any) {
        console.error("Error fetching survey data:", e)
        if (e.code === 'permission-denied') {
          setError('You do not have permission to view this data. Please ensure you are logged in as an admin.')
        } else {
          setError('Failed to load survey data. Please try refreshing the page.')
        }
        setIsLoading(false)
      }
    }

    fetchData()
  }, [surveyId, authLoading, permissionsLoading, isAdmin, isSuperAdmin, allowedForms])

  // Show loading state only until survey config + submissions are fetched.
  // The AI analysis section has its own inline spinner (isAnalyzing).
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

  // Only show hospital-specific metric cards when the survey actually has those fields.
  // Generic surveys (job applications, membership forms, etc.) have neither `rating`
  // nor `hospitalName` fields, so showing "0.0/10" and "Hospital" would be misleading.
  const showHospitalMetrics = hasHospitalFields(submissions)

  const avgRating = totalSubmissions > 0
    ? (submissions.reduce((acc, s) => acc + Number(s.rating || 0), 0) / totalSubmissions).toFixed(1)
    : '0.0'
  const excellent = submissions.filter(s => (Number(s.rating) || 0) >= 8).length
  const good = submissions.filter(s => (Number(s.rating) || 0) >= 5 && (Number(s.rating) || 0) < 8).length
  const needsImprovement = submissions.filter(s => (Number(s.rating) || 0) < 5).length

  // Get hospital name (only used when showHospitalMetrics is true)
  const hospitalName = submissions[0] ? getHospitalName(submissions[0]) : 'Hospital'

  // Most recent submission date for generic surveys
  const mostRecentDate = submissions.length > 0
    ? new Date(Math.max(...submissions.map(s => new Date(s.submittedAt).getTime())))
    : null

  // Survey title to display: prefer the config title, fall back to URL param
  const surveyTitle = surveyConfig?.title || `Survey ${surveyId}`

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid gap-8">
        {/* Header with Survey Title and Back Button */}
        <div className="space-y-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to All Surveys
            </Button>
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">{surveyTitle}</h1>
              <p className="text-muted-foreground mt-1">Survey Dashboard</p>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        {showHospitalMetrics ? (
          // Hospital-feedback surveys: show rating, hospital, and experience breakdown
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
        ) : (
          // Generic surveys: show total submissions and most recent date instead
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <CardTitle className="text-base">Most Recent</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {mostRecentDate
                    ? mostRecentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : '—'}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Custom Dashboard Widgets */}
        {surveyConfig?.dashboardWidgets && surveyConfig.dashboardWidgets.length > 0 && (
          <DashboardWidgets widgets={surveyConfig.dashboardWidgets} submissions={submissions} />
        )}

        {/* AI Analysis — renders independently after submissions table is visible */}
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
            ) : surveyConfig?.dashboardColumns?.length ? (
              // Survey has explicit column config — use it
              <>
                <div className="rounded-lg border overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium whitespace-nowrap">Date</th>
                        {surveyConfig.dashboardColumns.map((col) => (
                          <th key={col.fieldId} className="px-4 py-3 text-left text-sm font-medium whitespace-nowrap">{col.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {submissions.slice(0, 10).map((submission) => (
                        <tr key={submission.id} className="hover:bg-muted/20">
                          <td className="px-4 py-3 text-sm whitespace-nowrap">
                            {new Date(submission.submittedAt).toLocaleDateString()}
                          </td>
                          {surveyConfig.dashboardColumns!.map((col) => (
                            <td key={col.fieldId} className="px-4 py-3 text-sm max-w-xs">
                              <p className="line-clamp-2">
                                {extractStringValue((submission as any)[col.fieldId]) ?? '—'}
                              </p>
                            </td>
                          ))}
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
            ) : showHospitalMetrics ? (
              // Hospital-feedback fallback: show rating / experience / sentiment columns
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
                              <div className={`h-2 w-2 rounded-full ${(Number(submission.rating) || 0) >= 9 ? 'bg-green-500' :
                                  (Number(submission.rating) || 0) >= 7 ? 'bg-yellow-500' : 'bg-red-500'
                                }`} />
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm max-w-md">
                            <p className="line-clamp-2">{(submission as any).hospitalInteraction}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${(Number(submission.rating) || 0) >= 8 ? 'bg-green-100 text-green-700' :
                                (Number(submission.rating) || 0) >= 5 ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-red-100 text-red-700'
                              }`}>
                              {(Number(submission.rating) || 0) >= 8 ? 'Excellent' :
                                (Number(submission.rating) || 0) >= 5 ? 'Good' : 'Needs Improvement'}
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
            ) : (
              // Generic survey fallback: date + submission index only
              <>
                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium">#</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Date</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Submitter</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {submissions.slice(0, 10).map((submission, idx) => {
                        // Try to surface any name-like field from the submission
                        const rawSub = submission as any
                        const displayName =
                          rawSub.firstName || rawSub.first_name || rawSub.fname
                            ? `${rawSub.firstName || rawSub.first_name || rawSub.fname || ''} ${rawSub.lastName || rawSub.last_name || rawSub.lname || ''}`.trim()
                            : rawSub.name || rawSub.fullName || rawSub.full_name || null
                        return (
                          <tr key={submission.id} className="hover:bg-muted/20">
                            <td className="px-4 py-3 text-sm text-muted-foreground">{idx + 1}</td>
                            <td className="px-4 py-3 text-sm whitespace-nowrap">
                              {new Date(submission.submittedAt).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {displayName || <span className="italic text-muted-foreground">Anonymous</span>}
                            </td>
                          </tr>
                        )
                      })}
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
