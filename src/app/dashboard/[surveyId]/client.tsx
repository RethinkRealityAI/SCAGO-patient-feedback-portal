'use client'

import { Fragment, useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle, ArrowLeft, CheckCircle2, ChevronRight, Clock, Loader, RefreshCw, Repeat2 } from 'lucide-react'
import { MarkdownReport } from '@/components/markdown-report'
import { FeedbackSubmission } from '../types'
import { analyzeFeedbackForSurvey } from '../actions'
import { DashboardWidgets, type DashboardWidget } from '@/components/dashboard-widgets'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { getSurveyClient, updateSubmissionReviewStatus } from '@/lib/client-actions'
import { isReviewedFromState } from '@/lib/review-utils'
import {
  buildSurveySchema,
  enrichSubmissions,
  summariseRatings,
  type SubmissionMetrics,
  type SurveySchema,
} from '@/lib/submission-metrics'
import {
  RATING_BADGE_CLASS,
  RATING_DOT_CLASS,
  RATING_TONE_LABEL,
  formatRating,
  ratingTone,
} from '@/components/rating-indicator'
import { cityLabel, hospitalLabel, knownOptionLabel } from '@/lib/option-labels'
import { caseStatusLabel, caseStatusOf, slaState, type CaseConfig } from '@/lib/case-management'
import {
  DEFAULT_CASE_FILTERS,
  applyCaseFilters,
  assigneesOf,
  filterOptionsFor,
  flattenFields,
  groupByPerson,
  isFiltering,
  personKeys,
  repeatRequestCounts,
  toCsv,
  type CaseFilterState,
  type DashboardFilterDef,
} from '@/lib/case-filters'
import { CaseStatusPill, SlaBadge } from '@/components/case/case-badges'
import { CaseDetailSheet } from '@/components/case/case-detail-sheet'
import { CaseFilterBar, type FieldFilter } from '@/components/case/case-filter-bar'
import { CaseQuickActions } from '@/components/case/case-quick-actions'
import Link from 'next/link'

// Helper function to safely extract a string value from a field
// The field might be: a string, an object with .selection, or something else entirely
function extractStringValue(value: any): string | null {
  if (typeof value === 'string' && value.trim()) {
    return value.trim()
  }
  // Multi-select (checkbox) answers are arrays; list them rather than show "—".
  if (Array.isArray(value)) {
    const parts = value.map(extractStringValue).filter((v): v is string => !!v)
    return parts.length > 0 ? parts.join(', ') : null
  }
  if (value && typeof value === 'object') {
    // `{ selection: 'other', other: 'St Josephs' }` — the free-text entry is the
    // real answer; returning the literal 'other' showed a column full of "Other".
    if (value.selection === 'other' && typeof value.other === 'string' && value.other.trim()) {
      return value.other.trim()
    }
    if (typeof value.selection === 'string' && value.selection.trim()) {
      // City / hospital fields store a slug (`north-bay`); show what the form showed.
      return knownOptionLabel(value.selection) ?? value.selection.trim()
    }
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
  // Stored as a slug (`woodstock-hospital`); show the label the form displayed.
  const value =
    extractStringValue(submission.hospitalName) ||
    extractStringValue(submission.hospital) ||
    extractStringValue(submission['hospital-on'])
  return value ? hospitalLabel(value) : 'Unknown hospital'
}

// Detect whether any submission in the set carries hospital-feedback fields.
// Used to decide whether to show hospital-specific metric cards.
function hasHospitalFields(submissions: FeedbackSubmission[]): boolean {
  return submissions.some(
    s =>
      s.rating !== undefined ||
      !!(s as any).hospitalInteraction ||
      !!(s as any).hospitalName ||
      !!(s as any)['hospital-on']
  )
}

interface ReviewConfig {
  enabled?: boolean
  reviewedLabel?: string
  pendingLabel?: string
  actionLabel?: string
  undoLabel?: string
}

interface DashboardColumn { fieldId: string; label: string }

interface SurveyConfig {
  dashboardColumns?: DashboardColumn[]
  dashboardWidgets?: DashboardWidget[]
  title?: string
  reviewConfig?: ReviewConfig
  /** Status / assignee / notes / response-deadline tracking; replaces the review toggle. */
  caseConfig?: CaseConfig
  /** Questions offered as filters on a case-managed dashboard. */
  dashboardFilters?: DashboardFilterDef[]
  /** Show the AI summary card. Defaults to on, except for case-managed forms. */
  aiAnalysisEnabled?: boolean
  sections?: Array<{ id?: string; title?: string; fields?: any[] }>
}

/** Whether a form's dashboard runs the AI summary. */
function aiAnalysisWanted(config: SurveyConfig | null): boolean {
  if (!config) return true
  return config.aiAnalysisEnabled ?? !config.caseConfig?.enabled
}

type CaseTab = 'all' | 'awaiting' | 'overdue' | 'in-progress' | 'closed'

export default function SurveyDashboardClient({ surveyId }: { surveyId: string }) {
  const { isAdmin, isSuperAdmin, allowedForms, loading: authLoading, permissionsLoading } = useAuth()
  const [submissions, setSubmissions] = useState<FeedbackSubmission[]>([])
  const [submissionMetrics, setSubmissionMetrics] = useState<Map<string, SubmissionMetrics>>(new Map())
  const [surveyConfig, setSurveyConfig] = useState<SurveyConfig | null>(null)
  const [resolvedSurveyId, setResolvedSurveyId] = useState<string>('')
  const [analysis, setAnalysis] = useState<{ summary?: string; error?: string } | null>(null)
  // isLoading covers only the initial data fetch (survey config + submissions).
  // isAnalyzing covers the separate AI analysis request that runs after data is loaded,
  // so the submissions table can render while analysis is still in progress.
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  // Review workflow state
  const [reviewOverrides, setReviewOverrides] = useState<Record<string, boolean>>({})
  const [pendingReviews, setPendingReviews] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'reviewed'>('all')
  const [caseTab, setCaseTab] = useState<CaseTab>('all')
  const [openCaseId, setOpenCaseId] = useState<string | null>(null)
  const [caseFilters, setCaseFilters] = useState<CaseFilterState>(DEFAULT_CASE_FILTERS)
  // One row per person, with their earlier requests tucked under the latest.
  const [groupPeople, setGroupPeople] = useState(true)
  const [expandedPeople, setExpandedPeople] = useState<Set<string>>(new Set())
  const { toast } = useToast()

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
          getSurveyClient(surveyId),
          import('@/lib/submission-utils'),
        ])

        // Resolve the canonical Firestore doc ID (getSurvey may resolve a slug)
        const resolvedId: string =
          !('error' in surveyResult) && (surveyResult as any).id
            ? (surveyResult as any).id
            : surveyId

        setResolvedSurveyId(resolvedId)

        // Enforce per-survey access for restricted admins
        if (isAdmin && !isSuperAdmin) {
          const permitted = allowedForms ?? []
          if (!permitted.includes(resolvedId)) {
            setError("You do not have permission to view this survey's dashboard.")
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

        // Resolve each submission's rating and narrative from the survey's own
        // field definitions. Survey-editor fields carry generated ids, so the
        // canonical `rating` / `hospitalInteraction` values only exist once the
        // survey schema has been read.
        const schema = buildSurveySchema('error' in surveyResult ? null : surveyResult)
        const { submissions: enriched, metricsById } = enrichSubmissions(
          filteredSubmissions,
          () => schema
        )
        setSubmissions(enriched)
        setSubmissionMetrics(metricsById)

        // Stop the main loading spinner now — the submissions table can render.
        // AI analysis runs separately so the page isn't blocked waiting for it.
        setIsLoading(false)

        // Case-managed forms are worked from the table; they skip the AI summary.
        if (!aiAnalysisWanted('error' in surveyResult ? null : (surveyResult as SurveyConfig))) return

        // Run analysis using the canonical ID
        setIsAnalyzing(true)
        const analysisResult = await analyzeFeedbackForSurvey(resolvedId)
        setAnalysis(analysisResult)
        setIsAnalyzing(false)
      } catch (e: any) {
        console.error('Error fetching survey data:', e)
        setError(
          e.code === 'permission-denied'
            ? 'You do not have permission to view this data. Please ensure you are logged in as an admin.'
            : 'Failed to load survey data. Please try refreshing the page.'
        )
        setIsLoading(false)
      }
    }

    fetchData()
  }, [surveyId, authLoading, permissionsLoading, isAdmin, isSuperAdmin, allowedForms])

  // ── Review helpers ──────────────────────────────────────────────────────────

  const isReviewed = useCallback(
    (submission: FeedbackSubmission): boolean =>
      isReviewedFromState(submission.id, reviewOverrides, (submission as any).reviewed),
    [reviewOverrides]
  )

  const toggleReview = useCallback(
    async (submission: FeedbackSubmission) => {
      // Guard: fetchData must have resolved the canonical Firestore doc ID first.
      // resolvedSurveyId starts as '' and is set in fetchData before isLoading=false,
      // so the UI is never visible with an empty resolvedSurveyId — but guard anyway.
      if (!resolvedSurveyId) return
      const newState = !isReviewed(submission)
      // Optimistic update — UI responds immediately
      setReviewOverrides(prev => ({ ...prev, [submission.id]: newState }))
      setPendingReviews(prev => new Set(prev).add(submission.id))

      const result = await updateSubmissionReviewStatus(submission.id, resolvedSurveyId, newState)

      setPendingReviews(prev => {
        const next = new Set(prev)
        next.delete(submission.id)
        return next
      })
      // Revert on error and notify user
      if (result.error) {
        setReviewOverrides(prev => ({ ...prev, [submission.id]: !newState }))
        toast({ title: 'Could not save review status', description: result.error, variant: 'destructive' })
      }
    },
    [isReviewed, resolvedSurveyId, toast]
  )

  // Show loading state only until survey config + submissions are fetched.
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

  // ── Derived metrics ─────────────────────────────────────────────────────────
  const totalSubmissions = submissions.length

  // Only show hospital-specific metric cards when the survey actually has those fields.
  const showHospitalMetrics = hasHospitalFields(submissions)

  // Averages count only submissions that carry a rating. Dividing by every
  // submission treated a skipped rating question as a zero-star review and
  // dragged the headline number well below the actual scores.
  const surveySchema = buildSurveySchema(surveyConfig)
  const ratingSummary = summariseRatings(submissions, () => surveySchema)
  const avgRating = ratingSummary.average === null ? null : ratingSummary.average.toFixed(1)
  const { excellent, good, needsImprovement, rated: ratedCount } = ratingSummary

  // Which hospitals this portal has heard about, busiest first. The card used to
  // show only the first submission's hospital, which read as though every report
  // came from that one site.
  const hospitalBreakdown = Array.from(
    submissions.reduce((counts, submission) => {
      const name = getHospitalName(submission)
      // Submissions with no hospital recorded are not a hospital.
      if (name === 'Unknown hospital') return counts
      return counts.set(name, (counts.get(name) ?? 0) + 1)
    }, new Map<string, number>())
  )
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
  const mostRecentDate =
    submissions.length > 0
      ? new Date(Math.max(...submissions.map(s => new Date(s.submittedAt).getTime())))
      : null
  const surveyTitle = surveyConfig?.title || `Survey ${surveyId}`

  // Review metrics
  const reviewConfig = surveyConfig?.reviewConfig
  const reviewEnabled = reviewConfig?.enabled ?? false
  const reviewedCount = reviewEnabled ? submissions.filter(s => isReviewed(s)).length : 0
  const pendingCount = reviewEnabled ? totalSubmissions - reviewedCount : 0
  const reviewProgress = totalSubmissions > 0 ? Math.round((reviewedCount / totalSubmissions) * 100) : 0

  // Case tracking (status, assignee, notes, response deadline). When enabled it
  // supersedes the simpler review toggle on this page.
  const caseConfig = surveyConfig?.caseConfig?.enabled ? surveyConfig.caseConfig : null
  const caseInfo = (submission: FeedbackSubmission) => {
    const status = caseStatusOf(submission as any, caseConfig!)
    return { status, sla: slaState(new Date(submission.submittedAt), status, caseConfig!) }
  }
  const bucketCases = (list: FeedbackSubmission[]) =>
    list.reduce(
      (buckets, submission) => {
        const { status, sla } = caseInfo(submission)
        if (status === caseConfig!.initialStatus) buckets.awaiting.push(submission)
        else if ((caseConfig!.closedStatuses || []).includes(status)) buckets.closed.push(submission)
        else buckets.inProgress.push(submission)
        if (sla.kind === 'overdue') buckets.overdue.push(submission)
        if (sla.kind === 'due-soon') buckets.dueSoon.push(submission)
        return buckets
      },
      {
        awaiting: [] as FeedbackSubmission[],
        overdue: [] as FeedbackSubmission[],
        dueSoon: [] as FeedbackSubmission[],
        inProgress: [] as FeedbackSubmission[],
        closed: [] as FeedbackSubmission[],
      }
    )
  // Headline cards count everything; the tabs count what the filters leave.
  const caseBuckets = caseConfig ? bucketCases(submissions) : null

  // Search + filters (case-managed forms only).
  const formFields = flattenFields(surveyConfig?.sections)
  const fieldFilters: FieldFilter[] = caseConfig
    ? (surveyConfig?.dashboardFilters || []).map(f => ({
        fieldId: f.fieldId,
        label: f.label,
        options: filterOptionsFor(formFields.find(field => field.id === f.fieldId), submissions as any[], f.fieldId),
      }))
    : []
  const filteredCases = caseConfig
    ? applyCaseFilters(submissions, caseFilters, {
        statusOf: s => caseStatusOf(s, caseConfig),
        deadlineOf: s => {
          const { sla } = caseInfo(s as FeedbackSubmission)
          return sla.kind === 'none' ? Infinity : sla.dueDate.getTime()
        },
      })
    : submissions
  const filteredBuckets = caseConfig ? bucketCases(filteredCases) : null
  const repeatCounts = caseConfig ? repeatRequestCounts(submissions as any[]) : new Map<string, number>()
  const personOf = caseConfig ? personKeys(submissions as any[]) : new Map<string, string>()
  const peopleCount = new Set(personOf.values()).size
  const togglePerson = (key: string) =>
    setExpandedPeople(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  const caseDate = (s: FeedbackSubmission) =>
    new Date(s.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const shortDate = (s: FeedbackSubmission) => {
    const d = new Date(s.submittedAt)
    return d.toLocaleDateString('en-US', d.getFullYear() === new Date().getFullYear()
      ? { month: 'short', day: 'numeric' }
      : { month: 'short', day: 'numeric', year: 'numeric' })
  }
  const hasImported = submissions.some(s => (s as any).importedFrom)
  const openCase = openCaseId ? submissions.find(s => s.id === openCaseId) ?? null : null

  /** Download the cases currently shown, every answer included, as a spreadsheet. */
  const exportCases = () => {
    if (!caseConfig) return
    const answerFields = formFields.filter(f => !['text-block', 'logo', 'group'].includes(f.type))
    const cellFor = (value: any, type?: string): string => {
      if (value === null || value === undefined) return ''
      if (Array.isArray(value)) return value.map(v => cellFor(v, type)).filter(Boolean).join('; ')
      if (typeof value === 'boolean') return value ? 'Yes' : 'No'
      if (typeof value === 'object') {
        if (value.selection === 'other') return value.other || 'Other'
        if (typeof value.selection === 'string') return type === 'city-on' ? cityLabel(value.selection) : knownOptionLabel(value.selection) ?? value.selection
        return ''
      }
      return String(value)
    }
    const header = ['Received', 'Status', 'Assigned to', 'Response due', ...answerFields.map(f => f.label || f.id), 'Notes', 'Source']
    const rows = filteredCases.map(s => {
      const raw = s as any
      const { status, sla } = caseInfo(s)
      const answers = answerFields.flatMap(f => {
        const main = cellFor(raw[f.id], f.type)
        const other = raw[`${f.id}_otherValue`]
        return [other ? `${main} (Other: ${other})` : main]
      })
      return [
        new Date(s.submittedAt).toLocaleString('en-CA', { timeZone: 'America/Toronto' }),
        caseStatusLabel(status, caseConfig),
        raw.assignedTo || '',
        sla.kind === 'none' ? '' : sla.dueDate.toLocaleDateString('en-CA', { timeZone: 'America/Toronto' }),
        ...answers,
        (raw.caseNotes || []).map((n: any) => `${n.at ? new Date(n.at).toLocaleDateString('en-CA') + ' ' : ''}${n.author ? n.author + ': ' : ''}${n.text}`).join(' | '),
        raw.importedFrom ? `Imported (${raw.importedFrom})` : 'Portal',
      ]
    })
    const blob = new Blob([toCsv([header, ...rows])], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${resolvedSurveyId || surveyId}-cases-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const applyCaseUpdate = (submissionId: string, patch: Record<string, any>) =>
    setSubmissions(prev => prev.map(s => (s.id === submissionId ? ({ ...s, ...patch } as FeedbackSubmission) : s)))

  // ── Render helpers ──────────────────────────────────────────────────────────

  /**
   * `shownWith`: how many of this person's other requests are already listed
   * alongside it (in its group). The tag then only counts the ones not shown.
   */
  const renderReviewCell = (submission: FeedbackSubmission, shownWith?: number) => {
    if (caseConfig) {
      const { status, sla } = caseInfo(submission)
      const others = repeatCounts.get(submission.id) ?? 0
      const hidden = shownWith === undefined ? others : others - shownWith
      return (
        <td className="px-4 py-3">
          <div className="flex min-w-[11rem] flex-col items-start gap-1.5">
            <CaseStatusPill status={status} config={caseConfig} />
            <SlaBadge state={sla} />
            {(submission as any).assignedTo && (
              <span className="text-xs text-muted-foreground">{(submission as any).assignedTo}</span>
            )}
            {hidden > 0 && (
              <span
                className="inline-flex items-center gap-1 text-xs text-violet-700 dark:text-violet-300"
                title={
                  shownWith === undefined
                    ? 'Same email or phone number as another request on this form'
                    : 'This person has other requests outside the current tab or filters'
                }
              >
                <Repeat2 className="h-3 w-3" />
                {shownWith === undefined
                  ? `${hidden} other request${hidden === 1 ? '' : 's'}`
                  : `${hidden} more not shown`}
              </span>
            )}
          </div>
        </td>
      )
    }
    if (!reviewEnabled) return null
    const reviewed = isReviewed(submission)
    const isPending = pendingReviews.has(submission.id)

    return (
      <td className="px-4 py-3 whitespace-nowrap">
        {isPending ? (
          <Loader className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : reviewed ? (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
              <CheckCircle2 className="h-3 w-3" />
              {reviewConfig?.reviewedLabel || 'Reviewed'}
            </span>
            <button
              onClick={() => toggleReview(submission)}
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
            >
              {reviewConfig?.undoLabel || 'Undo'}
            </button>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => toggleReview(submission)}
            className="h-7 gap-1.5 text-xs whitespace-nowrap"
          >
            <Clock className="h-3 w-3" />
            {reviewConfig?.actionLabel || 'Mark as Reviewed'}
          </Button>
        )}
      </td>
    )
  }

  const reviewColumnHeader = reviewEnabled || caseConfig ? (
    <th className="px-4 py-3 text-left text-sm font-medium whitespace-nowrap">Status</th>
  ) : null

  // Quick status changes from the list, without opening the case panel.
  const actionsColumnHeader = caseConfig ? (
    // Pinned to the right edge so actions stay in reach when the table scrolls sideways.
    <th className="sticky right-0 z-10 bg-muted px-4 py-3 text-right text-sm font-medium whitespace-nowrap shadow-[-10px_0_10px_-10px_rgba(0,0,0,0.25)]">
      Actions
    </th>
  ) : null
  const renderActionsCell = (submission: FeedbackSubmission) =>
    caseConfig ? (
      <td className="sticky right-0 z-10 bg-card px-3 py-3 text-right align-middle shadow-[-10px_0_10px_-10px_rgba(0,0,0,0.25)]">
        <CaseQuickActions submission={submission as any} config={caseConfig} surveyId={resolvedSurveyId} onUpdated={applyCaseUpdate} />
      </td>
    ) : null

  // With case tracking, a row opens the case panel (full answers + controls).
  const caseRowProps = (submission: FeedbackSubmission) =>
    caseConfig
      ? {
          onClick: () => setOpenCaseId(submission.id),
          onKeyDown: (e: React.KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              setOpenCaseId(submission.id)
            }
          },
          tabIndex: 0,
          role: 'button' as const,
          'aria-label': 'Open case',
          className: 'cursor-pointer hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none transition-colors',
        }
      : { className: 'hover:bg-muted/20 transition-colors' }

  const renderSubmissionsTable = (subs: FeedbackSubmission[]) => {
    if (subs.length === 0) {
      const filtering = !!caseConfig && isFiltering(caseFilters)
      return (
        <div className="rounded-lg border py-12 text-center text-sm text-muted-foreground">
          {filtering ? 'No cases match your search and filters.' : 'No submissions in this category.'}
          {filtering && (
            <div className="mt-3">
              <Button variant="outline" size="sm" onClick={() => setCaseFilters({ ...DEFAULT_CASE_FILTERS, sort: caseFilters.sort })}>
                Clear search and filters
              </Button>
            </div>
          )}
        </div>
      )
    }

    if (surveyConfig?.dashboardColumns?.length && caseConfig && groupPeople) {
      const columns = surveyConfig.dashboardColumns
      const answerCells = (submission: FeedbackSubmission, muted = false) =>
        columns.map(col => (
          <td key={col.fieldId} className={`px-4 py-3 text-sm max-w-xs ${muted ? 'text-muted-foreground' : ''}`}>
            <p className="line-clamp-2">{extractStringValue((submission as any)[col.fieldId]) ?? '—'}</p>
          </td>
        ))
      return (
        <div className="rounded-lg border overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium whitespace-nowrap">Received</th>
                {columns.map(col => (
                  <th key={col.fieldId} className="px-4 py-3 text-left text-sm font-medium whitespace-nowrap">
                    {col.label}
                  </th>
                ))}
                {reviewColumnHeader}
                {actionsColumnHeader}
              </tr>
            </thead>
            <tbody className="divide-y">
              {groupByPerson(subs, personOf).map(({ key, latest, earlier }) => {
                const expanded = earlier.length > 0 && expandedPeople.has(key)
                const row = caseRowProps(latest)
                const name = [(latest as any).firstName, (latest as any).lastName].filter(Boolean).join(' ') || 'this person'
                return (
                  <Fragment key={key}>
                    <tr {...row} className={`${row.className} ${expanded ? 'bg-muted/30' : ''}`}>
                      <td className="px-4 py-3 align-top text-sm">
                        <div className="flex items-start gap-1.5">
                          {earlier.length > 0 ? (
                            <button
                              type="button"
                              onClick={e => { e.stopPropagation(); togglePerson(key) }}
                              onKeyDown={e => e.stopPropagation()}
                              aria-expanded={expanded}
                              aria-label={`${expanded ? 'Hide' : 'Show'} ${earlier.length} earlier request${earlier.length === 1 ? '' : 's'} from ${name}`}
                              className="-ml-1 mt-px rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              <ChevronRight className={`h-4 w-4 transition-transform ${expanded ? 'rotate-90' : ''}`} />
                            </button>
                          ) : (
                            <span className="w-4 shrink-0" aria-hidden />
                          )}
                          <div className="min-w-0">
                            <div className="whitespace-nowrap font-medium">{caseDate(latest)}</div>
                            {earlier.length > 0 && (
                              <div className="mt-0.5 whitespace-nowrap text-xs text-muted-foreground">
                                also {earlier.slice(0, 2).map(shortDate).join(', ')}
                                {earlier.length > 2 && ` +${earlier.length - 2} more`}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      {answerCells(latest)}
                      {renderReviewCell(latest, earlier.length)}
                      {renderActionsCell(latest)}
                    </tr>
                    {expanded &&
                      earlier.map(s => {
                        const sub = caseRowProps(s)
                        return (
                          <tr
                            key={s.id}
                            {...sub}
                            aria-label={`Open earlier request from ${caseDate(s)}`}
                            className={`${sub.className} bg-muted/20`}
                          >
                            <td className="py-3 pl-10 pr-4 align-top text-sm whitespace-nowrap text-muted-foreground">
                              <span className="mr-1.5 text-muted-foreground/60" aria-hidden>↳</span>
                              {caseDate(s)}
                            </td>
                            {answerCells(s, true)}
                            {renderReviewCell(s, earlier.length)}
                            {renderActionsCell(s)}
                          </tr>
                        )
                      })}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )
    }

    if (surveyConfig?.dashboardColumns?.length) {
      return (
        <div className="rounded-lg border overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium whitespace-nowrap">Date</th>
                {surveyConfig.dashboardColumns.map(col => (
                  <th key={col.fieldId} className="px-4 py-3 text-left text-sm font-medium whitespace-nowrap">
                    {col.label}
                  </th>
                ))}
                {reviewColumnHeader}
                {actionsColumnHeader}
              </tr>
            </thead>
            <tbody className="divide-y">
              {subs.map(submission => (
                <tr key={submission.id} {...caseRowProps(submission)}>
                  <td className="px-4 py-3 text-sm whitespace-nowrap">
                    {new Date(submission.submittedAt).toLocaleDateString()}
                  </td>
                  {surveyConfig.dashboardColumns!.map(col => (
                    <td key={col.fieldId} className="px-4 py-3 text-sm max-w-xs">
                      <p className="line-clamp-2">
                        {extractStringValue((submission as any)[col.fieldId]) ?? '—'}
                      </p>
                    </td>
                  ))}
                  {renderReviewCell(submission)}
                  {renderActionsCell(submission)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    }

    if (showHospitalMetrics) {
      return (
        <div className="rounded-lg border overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium whitespace-nowrap">Date</th>
                {/* Hospital names are long; give the column room rather than
                    letting it wrap to one word per line on narrow screens. */}
                <th className="min-w-[11rem] px-4 py-3 text-left text-sm font-medium whitespace-nowrap">Hospital</th>
                <th className="px-4 py-3 text-left text-sm font-medium whitespace-nowrap">Rating</th>
                <th className="min-w-[20rem] px-4 py-3 text-left text-sm font-medium">Experience</th>
                <th className="px-4 py-3 text-left text-sm font-medium whitespace-nowrap">Sentiment</th>
                {reviewColumnHeader}
                {actionsColumnHeader}
              </tr>
            </thead>
            <tbody className="divide-y">
              {subs.map(submission => {
                const tone = ratingTone(submission.rating)
                const display = formatRating(submission.rating)
                const metrics = submissionMetrics.get(submission.id)
                const experience = metrics?.experience ?? null
                return (
                  <tr key={submission.id} {...caseRowProps(submission)}>
                    <td className="px-4 py-3 text-sm whitespace-nowrap">
                      {new Date(submission.submittedAt).toLocaleDateString()}
                    </td>
                    <td className="min-w-[11rem] px-4 py-3 text-sm">{getHospitalName(submission)}</td>
                    <td className="px-4 py-3">
                      <span
                        title={
                          metrics?.rating
                            ? `${metrics.rating.label} — answered ${metrics.rating.raw}/${metrics.rating.max}`
                            : 'This respondent did not answer a rating question'
                        }
                        className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm font-medium"
                      >
                        <span className={`h-2 w-2 rounded-full ${RATING_DOT_CLASS[tone]}`} />
                        {display ? `${display}/10` : <span className="text-muted-foreground">—</span>}
                      </span>
                    </td>
                    <td className="min-w-[20rem] max-w-md px-4 py-3 text-sm">
                      {experience ? (
                        <>
                          <p className="line-clamp-2" title={experience.text}>{experience.text}</p>
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">{experience.label}</p>
                        </>
                      ) : (
                        <span className="italic text-muted-foreground/60">No written feedback</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset ${RATING_BADGE_CLASS[tone]}`}
                      >
                        {RATING_TONE_LABEL[tone]}
                      </span>
                    </td>
                    {renderReviewCell(submission)}
                    {renderActionsCell(submission)}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )
    }

    // Generic survey fallback: date + submitter + index
    return (
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium">#</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Date</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Submitter</th>
              {reviewColumnHeader}
              {actionsColumnHeader}
            </tr>
          </thead>
          <tbody className="divide-y">
            {subs.map((submission, idx) => {
              const rawSub = submission as any
              const displayName =
                rawSub.firstName || rawSub.first_name || rawSub.fname
                  ? `${rawSub.firstName || rawSub.first_name || rawSub.fname || ''} ${
                      rawSub.lastName || rawSub.last_name || rawSub.lname || ''
                    }`.trim()
                  : rawSub.name || rawSub.fullName || rawSub.full_name || null
              return (
                <tr key={submission.id} {...caseRowProps(submission)}>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{idx + 1}</td>
                  <td className="px-4 py-3 text-sm whitespace-nowrap">
                    {new Date(submission.submittedAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {displayName || <span className="italic text-muted-foreground">Anonymous</span>}
                  </td>
                  {renderReviewCell(submission)}
                  {renderActionsCell(submission)}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )
  }

  // ── Main render ─────────────────────────────────────────────────────────────
  return (
    <div className="container mx-auto px-4 py-8">
      {/* `[&>*]:min-w-0` — grid items default to `min-width: auto`, so the wide
          submissions table pushed this whole column past the viewport and the
          page scrolled sideways on narrow screens. With min-width cleared the
          table scrolls inside its own `overflow-x-auto` wrapper instead. */}
      <div className="grid gap-8 [&>*]:min-w-0">

        {/* Header with Survey Title and Back Button */}
        <div className="space-y-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to All Surveys
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{surveyTitle}</h1>
            <p className="text-muted-foreground mt-1">{caseConfig ? 'Case management' : 'Survey Dashboard'}</p>
          </div>
        </div>

        {/* Key Metrics */}
        {showHospitalMetrics ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Total Submissions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalSubmissions}</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {mostRecentDate ? `Latest ${mostRecentDate.toLocaleDateString()}` : 'No submissions yet'}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Average Rating</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{avgRating ? `${avgRating}/10` : '—'}</div>
                {/* State the denominator: unrated submissions are excluded. */}
                <p className="mt-1 text-xs text-muted-foreground">
                  {ratedCount > 0
                    ? `${ratedCount} of ${totalSubmissions} rated`
                    : 'No ratings submitted yet'}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Hospitals Reported</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{hospitalBreakdown.length}</div>
                <p className="mt-1 truncate text-xs text-muted-foreground" title={hospitalBreakdown[0]?.name}>
                  {hospitalBreakdown[0]
                    ? `Most reported: ${hospitalBreakdown[0].name} (${hospitalBreakdown[0].count})`
                    : 'No hospital recorded'}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Experience Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                {ratedCount > 0 ? (
                  <>
                    <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div className="bg-emerald-500" style={{ width: `${(excellent / ratedCount) * 100}%` }} />
                      <div className="bg-amber-500" style={{ width: `${(good / ratedCount) * 100}%` }} />
                      <div className="bg-rose-500" style={{ width: `${(needsImprovement / ratedCount) * 100}%` }} />
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                      <span className="text-emerald-600">{excellent} excellent</span>
                      <span className="text-amber-600">{good} good</span>
                      <span className="text-rose-600">{needsImprovement} needs work</span>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">No ratings submitted yet</p>
                )}
              </CardContent>
            </Card>
          </div>
        ) : caseBuckets && caseConfig ? (
          // Each card is a shortcut to the matching list below.
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {(
              [
                {
                  tab: 'all',
                  title: 'All requests',
                  value: totalSubmissions,
                  note: `${caseBuckets.closed.length} closed`,
                  tone: '',
                  ring: '',
                },
                {
                  tab: 'awaiting',
                  title: caseStatusLabel(caseConfig.initialStatus, caseConfig),
                  value: caseBuckets.awaiting.length,
                  note: caseBuckets.dueSoon.length > 0
                    ? `${caseBuckets.dueSoon.length} due within 3 business days`
                    : caseConfig.slaBusinessDays ? `Reply within ${caseConfig.slaBusinessDays} business days` : 'Not yet actioned',
                  tone: 'text-amber-600 dark:text-amber-400',
                  ring: '',
                },
                {
                  tab: 'overdue',
                  title: 'Overdue',
                  value: caseBuckets.overdue.length,
                  note: caseBuckets.overdue.length > 0 ? 'Past the response deadline' : 'Nothing past the deadline',
                  tone: caseBuckets.overdue.length > 0 ? 'text-rose-600 dark:text-rose-400' : '',
                  ring: caseBuckets.overdue.length > 0 ? 'border-rose-300 dark:border-rose-800' : '',
                },
                {
                  tab: 'in-progress',
                  title: 'In progress',
                  value: caseBuckets.inProgress.length,
                  note: 'Contacted or consultation booked',
                  tone: 'text-blue-600 dark:text-blue-400',
                  ring: '',
                },
              ] as const
            ).map(card => (
              <button
                key={card.tab}
                type="button"
                onClick={() => {
                  setCaseTab(card.tab)
                  document.getElementById('case-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }}
                className={`rounded-xl border bg-card p-4 text-left shadow-sm transition hover:border-primary/40 hover:shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${card.ring} ${caseTab === card.tab ? 'ring-2 ring-primary/30' : ''}`}
                aria-label={`Show ${card.title.toLowerCase()}`}
              >
                <div className="text-sm font-medium text-muted-foreground">{card.title}</div>
                <div className={`mt-1 text-2xl font-bold tabular-nums sm:text-3xl ${card.tone}`}>{card.value}</div>
                <p className="mt-1 text-xs text-muted-foreground">{card.note}</p>
              </button>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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

        {/* Review Progress Card — only shown when review workflow is enabled */}
        {reviewEnabled && !caseConfig && totalSubmissions > 0 && (
          <Card className="border-l-4 border-l-primary">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  Review Progress
                </CardTitle>
                <span className="text-2xl font-bold tabular-nums">
                  {reviewedCount}{' '}
                  <span className="text-base font-normal text-muted-foreground">/ {totalSubmissions}</span>
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{ width: `${reviewProgress}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    {reviewedCount} {reviewConfig?.reviewedLabel || 'Reviewed'}
                  </span>
                  <span className="font-medium">{reviewProgress}%</span>
                  <span className="flex items-center gap-1">
                    {pendingCount} {reviewConfig?.pendingLabel || 'Pending Review'}
                    <Clock className="h-3 w-3 text-amber-500" />
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Custom Dashboard Widgets */}
        {surveyConfig?.dashboardWidgets && surveyConfig.dashboardWidgets.length > 0 && (
          <DashboardWidgets widgets={surveyConfig.dashboardWidgets} submissions={submissions} />
        )}

        {/* AI Analysis — renders independently after submissions table is visible */}
        {aiAnalysisWanted(surveyConfig) && (
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
              <div className="rounded-lg border bg-gradient-to-br from-primary/5 to-transparent p-6">
                <MarkdownReport markdown={analysis.summary as string} />
              </div>
            ) : null}
          </CardContent>
        </Card>
        )}

        {/* Submissions */}
        <Card id="case-list" className="scroll-mt-24">
          <CardHeader>
            <CardTitle>{caseConfig ? 'Requests' : 'Submissions'}</CardTitle>
            <CardDescription>
              {caseConfig
                ? 'Search, filter and open a request to update its status, assignee or notes.'
                : 'Individual responses for this survey'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {totalSubmissions === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No submissions found for this survey.
              </div>
            ) : filteredBuckets && caseConfig ? (
              <Tabs value={caseTab} onValueChange={v => setCaseTab(v as CaseTab)} className="w-full">
                <CaseFilterBar
                  filters={caseFilters}
                  onChange={setCaseFilters}
                  statuses={caseConfig.statuses}
                  assignees={assigneesOf(submissions as any[], caseConfig.assignees)}
                  fieldFilters={fieldFilters}
                  showSource={hasImported}
                  shown={filteredCases.length}
                  total={totalSubmissions}
                  people={peopleCount}
                  groupByPerson={groupPeople}
                  onGroupByPersonChange={setGroupPeople}
                  onExport={exportCases}
                />
                <TabsList className="mb-4 h-auto flex-wrap justify-start">
                  {(
                    [
                      ['all', 'All', filteredCases.length, 'bg-muted'],
                      ['awaiting', caseStatusLabel(caseConfig.initialStatus, caseConfig), filteredBuckets.awaiting.length, 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'],
                      ['overdue', 'Overdue', filteredBuckets.overdue.length, 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'],
                      ['in-progress', 'In progress', filteredBuckets.inProgress.length, 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'],
                      ['closed', 'Closed', filteredBuckets.closed.length, 'bg-muted'],
                    ] as const
                  ).map(([value, label, count, tone]) => (
                    <TabsTrigger key={value} value={value} className="gap-1.5 text-xs sm:text-sm">
                      {label}
                      <span className={`ml-0.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-xs font-medium ${tone}`}>
                        {count}
                      </span>
                    </TabsTrigger>
                  ))}
                </TabsList>
                <p className="mb-3 text-xs text-muted-foreground">Select a row to open the full request and update its status.</p>
                <TabsContent value="all">{renderSubmissionsTable(filteredCases)}</TabsContent>
                <TabsContent value="awaiting">{renderSubmissionsTable(filteredBuckets.awaiting)}</TabsContent>
                <TabsContent value="overdue">{renderSubmissionsTable(filteredBuckets.overdue)}</TabsContent>
                <TabsContent value="in-progress">{renderSubmissionsTable(filteredBuckets.inProgress)}</TabsContent>
                <TabsContent value="closed">{renderSubmissionsTable(filteredBuckets.closed)}</TabsContent>
              </Tabs>
            ) : reviewEnabled ? (
              <Tabs
                value={activeTab}
                onValueChange={v => setActiveTab(v as typeof activeTab)}
                className="w-full"
              >
                <TabsList className="mb-4 h-9">
                  <TabsTrigger value="all" className="gap-1.5 text-xs sm:text-sm">
                    All
                    <span className="ml-0.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-muted px-1.5 text-xs font-medium">
                      {submissions.length}
                    </span>
                  </TabsTrigger>
                  <TabsTrigger value="pending" className="gap-1.5 text-xs sm:text-sm">
                    <Clock className="h-3.5 w-3.5 text-amber-500" />
                    {reviewConfig?.pendingLabel || 'Pending'}
                    <span className="ml-0.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-100 px-1.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                      {pendingCount}
                    </span>
                  </TabsTrigger>
                  <TabsTrigger value="reviewed" className="gap-1.5 text-xs sm:text-sm">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                    {reviewConfig?.reviewedLabel || 'Reviewed'}
                    <span className="ml-0.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-green-100 px-1.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      {reviewedCount}
                    </span>
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="all">
                  {renderSubmissionsTable(submissions)}
                </TabsContent>
                <TabsContent value="pending">
                  {renderSubmissionsTable(submissions.filter(s => !isReviewed(s)))}
                </TabsContent>
                <TabsContent value="reviewed">
                  {renderSubmissionsTable(submissions.filter(s => isReviewed(s)))}
                </TabsContent>
              </Tabs>
            ) : (
              renderSubmissionsTable(submissions)
            )}
          </CardContent>
        </Card>

        {caseConfig && (
          <CaseDetailSheet
            open={!!openCase}
            onOpenChange={open => { if (!open) setOpenCaseId(null) }}
            submission={openCase as any}
            surveyId={resolvedSurveyId}
            sections={surveyConfig?.sections || []}
            config={caseConfig}
            onUpdated={applyCaseUpdate}
            personRequests={
              openCase
                ? groupByPerson(
                    submissions.filter(s => personOf.get(s.id) === personOf.get(openCase.id)),
                    personOf
                  ).flatMap(g => [g.latest, ...g.earlier])
                : []
            }
            onSelectRequest={setOpenCaseId}
          />
        )}
      </div>
    </div>
  )
}
