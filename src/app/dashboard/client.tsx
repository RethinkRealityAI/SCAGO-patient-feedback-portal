'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationPrevious,
  PaginationLink,
  PaginationNext,
} from '@/components/ui/pagination'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Loader, AlertCircle, Star, Calendar, Building2, Clock,
  Activity, Heart, Users, Sparkles, ThumbsUp, Download, FileText, FileSpreadsheet,
  TrendingUp as TrendingUpIcon, TrendingDown, Minus, ArrowUpRight, ArrowDownRight, Keyboard, MapPin
} from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { Line, LineChart, CartesianGrid, XAxis, YAxis, Bar, BarChart, Pie, PieChart, Cell, ResponsiveContainer, Tooltip, Legend, Area, AreaChart } from 'recharts'
import { Card as UCard } from '@/components/ui/card'
import { ClipboardList, TrendingUp, Gauge, BarChart3, Search, Filter, X, RefreshCw, MessageSquare, Trash2, Hash } from 'lucide-react'
import { FeedbackSubmission } from './types'
import { analyzeFeedback, generateAnalysisPdf } from './actions'
import ReactMarkdown from 'react-markdown'
import Link from 'next/link'
import { useNotificationCenter, useAnalyticsNotifications } from '@/hooks/use-notifications'

import { NotificationSystem } from '@/components/notification-system'
import FloatingChatButton from '@/components/floating-chat-button'
import AnalysisDisplay from '@/components/analysis-display'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { getQuestionText, formatAnswerValue } from '@/lib/question-mapping'
// Firestore imports removed - now using utility functions from @/lib/submission-utils
import { getSurveys } from '../actions'
import { useAuth } from '@/hooks/use-auth'
import { signOut } from '@/lib/firebase-auth'
import { LogOut } from 'lucide-react'

const SUBMISSIONS_PER_PAGE = 20

// Helper function to safely format date for export (returns ISO string or date only string)
function safeFormatDateForExport(dateValue: any, dateOnly: boolean = false): string {
  if (!dateValue) return 'Invalid Date'
  const date = new Date(dateValue)
  if (isNaN(date.getTime())) return 'Invalid Date'
  return dateOnly ? date.toISOString().split('T')[0] : date.toISOString()
}

// Helper function to detect if submissions are from consent survey
function isConsentSurvey(submissions: FeedbackSubmission[]): boolean {
  if (!submissions || submissions.length === 0) return false
  // Check multiple samples to be more robust
  return submissions.some(sample =>
    !!(sample.digitalSignature || sample.ageConfirmation || sample.scdConnection || sample.primaryHospital)
  )
}

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

// Helper function to extract hospital/location from a submission
// Handles multiple possible field name variations for consistent data access
// IMPORTANT: Always returns a string, never an object (fixes React error #31)
function getHospitalOrLocation(submission: FeedbackSubmission, preferLocation: boolean = false): string {
  if (preferLocation) {
    // For consent/intake forms, prefer city or primaryHospital
    return extractStringValue(submission.city) ||
      extractStringValue(submission.primaryHospital) ||
      extractStringValue(submission.hospitalName) ||
      extractStringValue(submission.hospital) ||
      extractStringValue(submission['hospital-on']) ||
      'Unknown Location'
  }
  // For feedback forms, prefer hospital fields
  return extractStringValue(submission.hospitalName) ||
    extractStringValue(submission.hospital) ||
    extractStringValue(submission['hospital-on']) ||
    'Unknown Hospital'
}

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth()
  const [submissions, setSubmissions] = useState<FeedbackSubmission[]>([])
  const [surveys, setSurveys] = useState<Array<{ id: string; title: string; description?: string }>>([])
  const [initialLoading, setInitialLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [analysis, setAnalysis] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedSurvey, setSelectedSurvey] = useState<string>('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [activeSubmission, setActiveSubmission] = useState<FeedbackSubmission | null>(null)
  const [singleAnalysis, setSingleAnalysis] = useState<string | null>(null)
  const [singleLoading, setSingleLoading] = useState(false)
  const [showInsights, setShowInsights] = useState(false)
  const [selectedChart, setSelectedChart] = useState<'rating' | 'pain' | 'wait' | 'stay' | 'satisfaction' | 'scdConnection' | 'contactPreferences' | 'geography' | 'submissions' | 'surveyBreakdown'>('rating')
  const [searchQuery, setSearchQuery] = useState('')
  const [dateRange, setDateRange] = useState<'all' | '7d' | '30d' | '90d'>('all')
  const [ratingFilter, setRatingFilter] = useState<'all' | 'excellent' | 'good' | 'poor'>('all')
  const [hospitalFilter, setHospitalFilter] = useState('all')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [compareMode, setCompareMode] = useState(false)
  const [compareSurvey, setCompareSurvey] = useState<string | null>(null)
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'compact'>('grid')

  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false)
  const [submissionToDelete, setSubmissionToDelete] = useState<FeedbackSubmission | null>(null)

  const handleDeleteSubmission = async () => {
    if (!submissionToDelete) return

    try {
      setIsLoading(true)
      const { deleteSubmission } = await import('@/lib/submission-utils')
      await deleteSubmission(submissionToDelete.id, submissionToDelete.surveyId)

      // Update local state
      setSubmissions(prev => prev.filter(s => s.id !== submissionToDelete.id))

      // Close modal if deleting the active item
      if (activeSubmission?.id === submissionToDelete.id) {
        closeSubmissionModal()
      }

      setSubmissionToDelete(null)
    } catch (e) {
      console.error("Failed to delete", e)
      setError("Failed to delete submission")
    } finally {
      setIsLoading(false)
    }
  }


  // The main Hospital Experience Reporting Portal survey ID - all legacy submissions map to this
  const HOSPITAL_SURVEY_ID = 'QDl3z7vLa0IQ4JgHBZ2s'

  // Only show active surveys from the surveys collection (not orphaned IDs)
  const surveyOptions = useMemo(() => {
    const knownSurveyIds = surveys.map(s => s.id)
    return ['all', ...knownSurveyIds]
  }, [surveys])

  // Map survey IDs to titles - only for known surveys
  const surveyTitleMap = useMemo(() => {
    const map = new Map<string, string>()
    surveys.forEach(survey => {
      map.set(survey.id, survey.title)
    })
    return map
  }, [surveys])

  // Get the normalized survey ID - maps orphaned/legacy IDs to the main Hospital survey
  const getNormalizedSurveyId = useCallback((surveyId: string | undefined): string => {
    if (!surveyId) return HOSPITAL_SURVEY_ID
    // If this survey ID exists in our known surveys, use it as-is
    if (surveyTitleMap.has(surveyId)) return surveyId
    // Otherwise, map to the Hospital Experience Reporting Portal
    return HOSPITAL_SURVEY_ID
  }, [surveyTitleMap])

  // Get display name for a survey ID (handles legacy IDs gracefully)
  const getSurveyDisplayName = useCallback((surveyId: string | undefined): string => {
    if (!surveyId) return surveyTitleMap.get(HOSPITAL_SURVEY_ID) || 'Hospital Experience Reporting Portal'
    // First check if we have a direct match
    if (surveyTitleMap.has(surveyId)) return surveyTitleMap.get(surveyId)!
    // For legacy IDs, show the Hospital survey name
    return surveyTitleMap.get(HOSPITAL_SURVEY_ID) || 'Hospital Experience Reporting Portal'
  }, [surveyTitleMap])


  // Dynamic hospital/location options based on selected survey type
  // This ensures the filter dropdown only shows locations that exist in the current view
  const hospitalOptions = useMemo(() => {
    // Filter submissions based on the selected survey
    let relevantSubmissions = submissions
    if (selectedSurvey !== 'all') {
      relevantSubmissions = submissions.filter(s => getNormalizedSurveyId(s.surveyId) === selectedSurvey)
    }

    // Determine if we're looking at consent/intake form data or hospital feedback
    const isCurrentlyConsent = selectedSurvey !== 'all' && isConsentSurvey(relevantSubmissions)

    // Extract unique locations/hospitals using the centralized helper function
    // This ensures consistent field extraction between dropdown and filter
    const locations = Array.from(new Set(relevantSubmissions.map(s => {
      return getHospitalOrLocation(s, isCurrentlyConsent)
    }).filter(loc => loc !== 'Unknown Location' && loc !== 'Unknown Hospital')))

    return ['all', ...locations.sort()]
  }, [submissions, selectedSurvey, getNormalizedSurveyId])

  // Fetch data on mount or when auth state changes
  useEffect(() => {
    async function fetchData() {
      // Wait for auth to initialize to prevent race conditions
      if (authLoading) return

      try {
        setInitialLoading(true)
        setFetchError(null)

        // Ensure user is authenticated and token is fresh (force refresh to get latest custom claims)
        if (!user) {
          setFetchError('You must be logged in to view this dashboard.')
          setInitialLoading(false)
          return
        }

        // Force refresh ID token to ensure we have latest custom claims
        // This is important if roles were recently updated
        if (user) {
          await user.getIdToken(true) // Force refresh to get latest custom claims
        }

        // Fetch submissions using utility function (handles both new and legacy structures)
        const { fetchAllSubmissions } = await import('@/lib/submission-utils')
        const uniqueSubmissions = await fetchAllSubmissions()
        setSubmissions(uniqueSubmissions)

        // Fetch surveys
        const surveysData = await getSurveys()
        setSurveys(surveysData)
      } catch (e: any) {
        console.error("Error fetching data:", e)
        if (e.code === 'permission-denied') {
          setFetchError('You do not have permission to view this data. Please ensure you are logged in as an admin.')
        } else {
          setFetchError('Failed to load dashboard data. Please try refreshing the page.')
        }
      } finally {
        setInitialLoading(false)
      }
    }

    fetchData()
  }, [authLoading, user])

  // Reset selectedSurvey if it's no longer valid (e.g., survey was deleted)
  useEffect(() => {
    if (selectedSurvey !== 'all' && !surveyOptions.includes(selectedSurvey)) {
      setSelectedSurvey('all')
    }
  }, [selectedSurvey, surveyOptions])

  // Reset hospital/location filter when survey changes (since available options differ per survey)
  useEffect(() => {
    // Only reset if the current filter value is not in the new options
    if (hospitalFilter !== 'all' && !hospitalOptions.includes(hospitalFilter)) {
      setHospitalFilter('all')
    }
  }, [hospitalOptions, hospitalFilter])

  // Detect if we're in "All Surveys" overview mode
  const isAllSurveysMode = selectedSurvey === 'all'

  // Detect if current filtered data is consent survey
  // Use getNormalizedSurveyId to match how filtered data is computed
  const isConsent = useMemo(() => {
    if (isAllSurveysMode) return false // Overview mode is neither consent nor feedback
    return isConsentSurvey(submissions.filter(s => getNormalizedSurveyId(s.surveyId) === selectedSurvey))
  }, [submissions, selectedSurvey, isAllSurveysMode, getNormalizedSurveyId])

  // Ensure the chart selection matches the survey type
  useEffect(() => {
    const feedbackCharts = new Set(['rating', 'pain', 'wait', 'stay', 'satisfaction'])
    const consentCharts = new Set(['submissions', 'scdConnection', 'contactPreferences', 'geography'])
    const overviewCharts = new Set(['submissions', 'geography', 'surveyBreakdown'])

    if (isAllSurveysMode && (feedbackCharts.has(selectedChart) || consentCharts.has(selectedChart)) && !overviewCharts.has(selectedChart)) {
      setSelectedChart('submissions')
    } else if (isConsent && feedbackCharts.has(selectedChart)) {
      setSelectedChart('submissions')
    } else if (!isConsent && !isAllSurveysMode && consentCharts.has(selectedChart)) {
      setSelectedChart('rating')
    }
  }, [isConsent, selectedChart, isAllSurveysMode])

  const filtered = useMemo(() => {
    // Start with all submissions - don't filter out based on survey existence
    // This ensures all submissions are visible even if their survey was deleted or not found
    let result = submissions

    // Filter by survey - use normalized ID to aggregate legacy submissions under appropriate survey
    if (selectedSurvey !== 'all') {
      result = result.filter(s => getNormalizedSurveyId(s.surveyId) === selectedSurvey)
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(s => {
        // Helper to check if this specific submission is a consent type
        const isConsentSubmission = isConsentSurvey([s])

        // Search all relevant fields based on submission type
        if (isConsentSubmission) {
          // Search consent-specific fields
          return (
            ((s as any).firstName || '').toLowerCase().includes(query) ||
            ((s as any).lastName || '').toLowerCase().includes(query) ||
            ((s as any).email || '').toLowerCase().includes(query) ||
            getHospitalOrLocation(s, true).toLowerCase().includes(query) ||
            (s.surveyId || '').toLowerCase().includes(query)
          )
        } else {
          // Search feedback-specific fields
          return (
            (s.hospitalInteraction || '').toLowerCase().includes(query) ||
            getHospitalOrLocation(s, false).toLowerCase().includes(query) ||
            (s.surveyId || '').toLowerCase().includes(query) ||
            // Also check rating if it's a number
            (s.rating && String(s.rating).includes(query))
          )
        }
      })
    }

    // Filter by date range
    if (dateRange !== 'all') {
      const now = new Date()
      const daysAgo = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90
      const cutoff = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000))
      result = result.filter(s => {
        if (!s.submittedAt) return false
        const date = new Date(s.submittedAt)
        if (isNaN(date.getTime())) return false
        return date >= cutoff
      })
    }

    // Filter by rating (only for submissions that have ratings - skip consent surveys)
    if (ratingFilter !== 'all') {
      result = result.filter(s => {
        const rating = Number(s.rating)
        // Skip submissions without valid ratings (consent surveys typically don't have ratings)
        if (isNaN(rating) || rating === 0) return false

        if (ratingFilter === 'excellent') {
          return rating >= 8
        } else if (ratingFilter === 'good') {
          return rating >= 5 && rating < 8
        } else if (ratingFilter === 'poor') {
          return rating < 5
        }
        return true
      })
    }

    // Filter by hospital/location (works for both consent and feedback surveys)
    // CRITICAL: Must use the same field extraction logic as hospitalOptions
    // This ensures the dropdown values match what the filter looks for
    if (hospitalFilter !== 'all') {
      // Determine if current view is consent-based (same logic as hospitalOptions)
      const isCurrentViewConsent = selectedSurvey !== 'all' && isConsentSurvey(
        submissions.filter(s => getNormalizedSurveyId(s.surveyId) === selectedSurvey)
      )

      result = result.filter(s => {
        // Use centralized helper with same preferLocation flag as hospitalOptions
        const location = getHospitalOrLocation(s, isCurrentViewConsent)
        return location === hospitalFilter
      })
    }

    return result
  }, [submissions, surveys, selectedSurvey, searchQuery, dateRange, ratingFilter, hospitalFilter, getNormalizedSurveyId])

  // Improved trend calculation for ratings and submissions
  const ratingTrend = useMemo(() => {
    if (dateRange === 'all' || isConsent || isAllSurveysMode) return null

    const now = new Date()
    const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90
    const currentCutoff = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000))
    const previousCutoff = new Date(now.getTime() - (2 * days * 24 * 60 * 60 * 1000))

    // Current period is already in 'filtered' (filtered also applies search and rating filters)
    const currentPeriod = filtered

    // We need a previous period that matches the same filters if possible
    const previousPeriod = submissions.filter(s => {
      if (!s.submittedAt) return false
      const d = new Date(s.submittedAt)
      if (isNaN(d.getTime())) return false

      // Basic time filter
      const inTime = d >= previousCutoff && d < currentCutoff
      if (!inTime) return false

      // Apply same survey filter
      if (selectedSurvey !== 'all' && getNormalizedSurveyId(s.surveyId) !== selectedSurvey) return false

      return true
    })

    if (currentPeriod.length === 0 || previousPeriod.length === 0) return null

    const currentRatings = currentPeriod.filter(s => s.rating != null && !isNaN(Number(s.rating)))
    const prevRatings = previousPeriod.filter(s => s.rating != null && !isNaN(Number(s.rating)))

    if (currentRatings.length === 0 || prevRatings.length === 0) return null

    const currentAvg = currentRatings.reduce((a, b) => a + Number(b.rating), 0) / currentRatings.length
    const prevAvg = prevRatings.reduce((a, b) => a + Number(b.rating), 0) / prevRatings.length

    const change = prevAvg > 0 ? ((currentAvg - prevAvg) / prevAvg) * 100 : 0

    return {
      direction: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral',
      change: Math.abs(change).toFixed(1),
      label: `Vs. previous ${days} days`
    }
  }, [filtered, submissions, dateRange, isConsent, isAllSurveysMode, selectedSurvey, getNormalizedSurveyId])

  const totalPages = Math.max(1, Math.ceil(filtered.length / SUBMISSIONS_PER_PAGE))

  // Reset to page 1 if current page is out of bounds
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1)
    }
  }, [totalPages, currentPage])

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  const paginatedSubmissions = filtered.slice(
    (currentPage - 1) * SUBMISSIONS_PER_PAGE,
    currentPage * SUBMISSIONS_PER_PAGE
  )

  const ratingOverTime = useMemo(() => {
    const byDate = new Map<string, { date: string; avg: number; count: number }>()
    for (const s of filtered) {
      // Validate submittedAt date
      const d = s.submittedAt ? new Date(s.submittedAt) : null
      if (!d || isNaN(d.getTime())) continue // Skip invalid dates

      const key = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString().slice(0, 10)
      const current = byDate.get(key) || { date: key, avg: 0, count: 0 }
      const nextCount = current.count + 1
      const ratingValue = Number(s.rating)
      const nextAvg = (current.avg * current.count + (isNaN(ratingValue) ? 0 : ratingValue)) / nextCount
      byDate.set(key, { date: key, avg: nextAvg, count: nextCount })
    }
    return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date))
  }, [filtered])

  const metrics = useMemo(() => {
    const total = filtered.length
    // Count unique surveys from all submissions (including those without matching survey docs)
    // Filter out undefined/null surveyIds to avoid counting them
    const surveysCount = new Set(submissions.map(s => s.surveyId).filter(id => id != null)).size

    if (isAllSurveysMode) {
      // Count submissions by survey
      const bySurvey = new Map<string, number>()
      filtered.forEach(s => {
        bySurvey.set(s.surveyId, (bySurvey.get(s.surveyId) || 0) + 1)
      })

      // Geographic distribution for overview mode
      const geographicDistribution = new Map<string, number>()
      filtered.forEach(s => {
        // In overview mode, check each submission's type individually
        const isSubmissionConsent = isConsentSurvey([s])
        const location = getHospitalOrLocation(s, isSubmissionConsent)
        geographicDistribution.set(location, (geographicDistribution.get(location) || 0) + 1)
      })

      const activeLocations = Array.from(geographicDistribution.keys()).filter(loc =>
        loc !== 'Unknown Location' && loc !== 'Unknown Hospital'
      ).length

      // Time-based analysis for Trend
      const now = new Date()
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
      const yesterdayStart = todayStart - (24 * 60 * 60 * 1000)

      const todayCount = filtered.filter(s => {
        const d = new Date(s.submittedAt).getTime()
        return d >= todayStart
      }).length

      const yesterdayCount = filtered.filter(s => {
        const d = new Date(s.submittedAt).getTime()
        return d >= yesterdayStart && d < todayStart
      }).length

      const dailyTrend = yesterdayCount > 0
        ? Math.round(((todayCount - yesterdayCount) / yesterdayCount) * 100)
        : todayCount > 0 ? 100 : 0

      // Last 30 Days (keep for chart or specific metric if needed, but we focus on trend)
      const last30Days = filtered.filter(s => {
        const date = new Date(s.submittedAt)
        const diffTime = now.getTime() - date.getTime()
        const diffDays = diffTime / (1000 * 60 * 60 * 24)
        return diffDays <= 30
      }).length

      return {
        total,
        surveysCount,
        activeLocations,
        dailyTrend,
        last30Days,
        overviewMetrics: {
          surveyBreakdown: Array.from(bySurvey.entries())
            .map(([surveyId, count]) => ({
              surveyId,
              surveyTitle: surveyTitleMap.get(surveyId) || surveyId,
              count,
              percentage: total > 0 ? Math.round((count / total) * 100) : 0
            }))
            .sort((a, b) => b.count - a.count),
          geographicDistribution: Array.from(geographicDistribution.entries())
            .map(([location, count]) => ({ location, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10),
          topLocation: Array.from(geographicDistribution.entries())
            .sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'
        }
      }
    }

    if (isConsent) {
      // Consent-specific metrics
      // Calculate "Contact Reach" - users who agreed to AT LEAST ONE contact method
      const contactReachCount = filtered.filter(s => {
        const sub = s as any
        return sub.mayContact === 'yes' || sub.joinMailingList === 'yes' || sub.joinSupportGroups === 'yes'
      }).length

      const scdConnectionCounts = new Map<string, number>()
      const mayContactYes = filtered.filter(s => (s as any).mayContact === 'yes').length
      const joinMailingListYes = filtered.filter(s => (s as any).joinMailingList === 'yes').length
      const joinSupportGroupsYes = filtered.filter(s => (s as any).joinSupportGroups === 'yes').length
      const consentToAdvocacyYes = filtered.filter(s => (s as any).consentToAdvocacy === 'yes').length

      // Count SCD connections
      for (const s of filtered) {
        const connections = (s as any).scdConnection
        if (Array.isArray(connections)) {
          connections.forEach((conn: string) => {
            scdConnectionCounts.set(conn, (scdConnectionCounts.get(conn) || 0) + 1)
          })
        } else if (connections) {
          scdConnectionCounts.set(connections, (scdConnectionCounts.get(connections) || 0) + 1)
        }
      }

      // Geographic distribution
      const geographicDistribution = new Map<string, number>()
      for (const s of filtered) {
        const location = getHospitalOrLocation(s, true)
        geographicDistribution.set(location, (geographicDistribution.get(location) || 0) + 1)
      }

      return {
        total,
        surveysCount,
        contactReachCount, // NEW METRIC
        contactReachPercent: total > 0 ? Math.round((contactReachCount / total) * 100) : 0,
        consentMetrics: {
          mayContactYes,
          mayContactPercent: total > 0 ? Math.round((mayContactYes / total) * 100) : 0,
          joinMailingListYes,
          joinMailingListPercent: total > 0 ? Math.round((joinMailingListYes / total) * 100) : 0,
          joinSupportGroupsYes,
          joinSupportGroupsPercent: total > 0 ? Math.round((joinSupportGroupsYes / total) * 100) : 0,
          consentToAdvocacyYes,
          consentToAdvocacyPercent: total > 0 ? Math.round((consentToAdvocacyYes / total) * 100) : 0,
          scdConnectionCounts: Array.from(scdConnectionCounts.entries())
            .map(([type, count]) => ({ type, count }))
            .sort((a, b) => b.count - a.count),
          geographicDistribution: Array.from(geographicDistribution.entries())
            .map(([city, count]) => ({ city, count }))
            .sort((a, b) => b.count - a.count)
        }
      }
    } else {
      // Hospital feedback metrics
      const validRatings = filtered.filter(s => s.rating != null && !isNaN(Number(s.rating)))
      const avg = validRatings.length > 0 ? (validRatings.reduce((a, s) => a + Number(s.rating), 0) / validRatings.length) : 0
      let excellent = 0, good = 0, needsImprovement = 0

      // NPS Calculation Variables
      let promoters = 0
      let detractors = 0
      let respondents = 0

      for (const s of validRatings) {
        const r = Number(s.rating)
        // Satisfaction Buckets
        if (r >= 8) excellent++
        else if (r >= 5) good++
        else needsImprovement++

        // NPS Buckets (standard 0-10 scale)
        // 9-10: Promoter
        // 7-8: Passive
        // 0-6: Detractor
        respondents++
        if (r >= 9) promoters++
        else if (r <= 6) detractors++
      }

      const npsScore = respondents > 0 ? Math.round(((promoters - detractors) / respondents) * 100) : 0

      // Group ratings by hospital
      const hospitalRatings = new Map<string, { total: number; sum: number; count: number }>()
      for (const s of validRatings) {
        const hospital = getHospitalOrLocation(s, false)
        const current = hospitalRatings.get(hospital) || { total: 0, sum: 0, count: 0 }
        hospitalRatings.set(hospital, {
          total: current.total + 1,
          sum: current.sum + Number(s.rating),
          count: current.count + 1
        })
      }

      return {
        total,
        avg: Number(avg.toFixed(1)),
        npsScore, // NEW METRIC
        excellent,
        good,
        needsImprovement,
        surveysCount,
        hospitalRatings: Array.from(hospitalRatings.entries())
          .map(([name, data]) => ({
            name,
            avgRating: data.count > 0 ? (data.sum / data.count).toFixed(1) : '0.0',
            count: data.count
          }))
          .sort((a, b) => b.count - a.count)
      }
    }
  }, [filtered, submissions, surveys, isConsent, isAllSurveysMode, surveyTitleMap])


  const experienceData = useMemo(() => {
    if (isConsent) {
      return [] // Not applicable for consent surveys
    }
    return [
      { name: 'Excellent (8-10)', value: (metrics as any).excellent || 0 },
      { name: 'Good (5-7)', value: (metrics as any).good || 0 },
      { name: 'Needs Improvement (0-4)', value: (metrics as any).needsImprovement || 0 },
    ]
  }, [metrics, isConsent])

  const submissionsOverTime = useMemo(() => {
    const byDate = new Map<string, number>()
    for (const s of filtered) {
      const d = new Date(s.submittedAt)
      const key = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString().slice(0, 10)
      byDate.set(key, (byDate.get(key) || 0) + 1)
    }
    return Array.from(byDate.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([date, count]) => ({ date, count }))
  }, [filtered])

  // Additional chart data computations
  const chartData = useMemo(() => {
    const m = metrics as any

    // Overview mode: High-level chart data
    if (isAllSurveysMode) {
      return {
        surveyBreakdown: m.overviewMetrics?.surveyBreakdown || [],
        geography: m.overviewMetrics?.geographicDistribution || [],
        scdConnection: [],
        contactPreferences: [],
        painScores: [],
        waitTimes: [],
        stayLength: [],
        departmentSatisfaction: []
      }
    }

    if (isConsent) {
      // Consent-specific chart data
      return {
        scdConnection: m.consentMetrics?.scdConnectionCounts || [],
        contactPreferences: [
          { preference: 'May Contact', count: m.consentMetrics?.mayContactYes || 0 },
          { preference: 'Mailing List', count: m.consentMetrics?.joinMailingListYes || 0 },
          { preference: 'Support Groups', count: m.consentMetrics?.joinSupportGroupsYes || 0 },
          { preference: 'Advocacy Consent', count: m.consentMetrics?.consentToAdvocacyYes || 0 },
        ],
        geography: m.consentMetrics?.geographicDistribution?.slice(0, 10) || [],
        surveyBreakdown: [],
        painScores: [],
        waitTimes: [],
        stayLength: [],
        departmentSatisfaction: []
      }
    }

    // Hospital feedback chart data
    const painScores = new Map<number, number>()
    for (let i = 0; i <= 10; i++) painScores.set(i, 0)

    const waitTimes = new Map<string, number>()
    const waitCategories = ['< 30min', '30-60min', '1-2hr', '2-4hr', '4-8hr', '> 8hr']
    waitCategories.forEach(cat => waitTimes.set(cat, 0))

    const stayLength = new Map<string, number>()
    const stayCategories = ['< 1 day', '1-2 days', '3-5 days', '1 week', '> 1 week']
    stayCategories.forEach(cat => stayLength.set(cat, 0))

    const departmentSatisfaction = new Map<string, { total: number; sum: number }>()

    const getSelectionValue = (val: any) => {
      if (val === undefined || val === null) return undefined
      if (typeof val === 'object' && 'selection' in val) return val.selection
      return val
    }

    for (const s of filtered) {
      // Pain Score extraction
      const painRaw = (s as any).painScore ?? (s as any).painLevel ?? (s as any).emergencyPainLevel
      const pain = getSelectionValue(painRaw)
      if (pain !== undefined) {
        const painNum = Number(pain)
        if (!isNaN(painNum)) {
          painScores.set(painNum, (painScores.get(painNum) || 0) + 1)
        }
      }

      // Wait Time extraction
      const waitRaw = (s as any).waitTime ?? (s as any).emergencyWaitTime
      const wait = waitRaw
      if (wait) {
        let category = ''
        if (typeof wait === 'object' && ('hours' in wait || 'minutes' in wait)) {
          const totalMinutes = (wait.hours || 0) * 60 + (wait.minutes || 0)
          if (totalMinutes < 30) category = '< 30min'
          else if (totalMinutes <= 60) category = '30-60min'
          else if (totalMinutes <= 120) category = '1-2hr'
          else if (totalMinutes <= 240) category = '2-4hr'
          else if (totalMinutes <= 480) category = '4-8hr'
          else category = '> 8hr'
        } else {
          // It's likely a selection string or object
          const val = getSelectionValue(wait)
          if (typeof val === 'string') {
            // Check if it matches a category directly
            if (waitCategories.includes(val)) category = val
            // Fallback: try to approximate if it's a number string
            else {
              const numMatch = val.match(/\d+/)
              if (numMatch) {
                const num = parseInt(numMatch[0])
                if (val.toLowerCase().includes('hr') || val.toLowerCase().includes('hour')) {
                  if (num < 1) category = '< 30min'
                  else if (num < 2) category = '1-2hr'
                  else if (num < 4) category = '2-4hr'
                  else if (num < 8) category = '4-8hr'
                  else category = '> 8hr'
                } else {
                  if (num < 30) category = '< 30min'
                  else if (num < 60) category = '30-60min'
                  else category = '1-2hr'
                }
              }
            }
          }
        }
        if (category && waitTimes.has(category)) {
          waitTimes.set(category, (waitTimes.get(category) || 0) + 1)
        }
      }

      // Length of Stay extraction
      const stayRaw = (s as any).lengthOfStay ?? (s as any).stayDuration
      const stay = stayRaw
      if (stay) {
        let category = ''
        if (typeof stay === 'object' && ('days' in stay || 'hours' in stay)) {
          const totalDays = (stay.days || 0) + (stay.hours || 0) / 24
          if (totalDays < 1) category = '< 1 day'
          else if (totalDays <= 2) category = '1-2 days'
          else if (totalDays <= 5) category = '3-5 days'
          else if (totalDays <= 7) category = '1 week'
          else category = '> 1 week'
        } else {
          const val = getSelectionValue(stay)
          if (typeof val === 'string') {
            if (stayCategories.includes(val)) category = val
            else {
              const numMatch = val.match(/\d+/)
              if (numMatch) {
                const num = parseInt(numMatch[0])
                if (val.toLowerCase().includes('week')) {
                  if (num < 1) category = '3-5 days'
                  else if (num === 1) category = '1 week'
                  else category = '> 1 week'
                } else {
                  if (num < 1) category = '< 1 day'
                  else if (num <= 2) category = '1-2 days'
                  else if (num <= 5) category = '3-5 days'
                  else if (num <= 7) category = '1 week'
                  else category = '> 1 week'
                }
              }
            }
          }
        }
        if (category && stayLength.has(category)) {
          stayLength.set(category, (stayLength.get(category) || 0) + 1)
        }
      }

      const dept = getSelectionValue((s as any).department) || 'Unknown'
      const current = departmentSatisfaction.get(dept) || { total: 0, sum: 0 }
      departmentSatisfaction.set(dept, {
        total: current.total + 1,
        sum: current.sum + Number(s.rating || 0)
      })
    }

    return {
      painScores: Array.from(painScores.entries())
        .map(([score, count]) => ({ score, count }))
        .filter(item => item.count > 0),
      waitTimes: Array.from(waitTimes.entries())
        .map(([category, count]) => ({ category, count }))
        .filter(item => item.count > 0),
      stayLength: Array.from(stayLength.entries())
        .map(([category, count]) => ({ category, count }))
        .filter(item => item.count > 0),
      departmentSatisfaction: Array.from(departmentSatisfaction.entries())
        .map(([dept, data]) => ({
          department: dept,
          avgRating: data.total > 0 ? (data.sum / data.total).toFixed(1) : '0',
          count: data.total
        }))
        .sort((a, b) => parseFloat(b.avgRating) - parseFloat(a.avgRating))
        .slice(0, 5),
      scdConnection: [],
      contactPreferences: [],
      geography: [],
      surveyBreakdown: []
    }
  }, [filtered, isConsent, metrics, isAllSurveysMode])

  const handleAnalyzeFeedback = async () => {
    setIsLoading(true)
    setError(null)
    // Use survey-specific analysis if a survey is selected
    const result = selectedSurvey !== 'all'
      ? await (async () => {
        const { analyzeFeedbackForSurvey } = await import('./actions')
        return analyzeFeedbackForSurvey(selectedSurvey)
      })()
      : await analyzeFeedback()
    if (result.error) {
      setError(result.error)
    } else {
      setAnalysis(typeof result.summary === 'string' ? result.summary : String(result.summary ?? ''))
    }
    setIsLoading(false)
  }

  const handleDownloadPdf = async () => {
    if (!analysis) return
    const res = await generateAnalysisPdf({ title: 'Feedback Analysis', surveyId: selectedSurvey === 'all' ? 'all' : selectedSurvey, analysisMarkdown: analysis })
    if (res.error || !res.pdfBase64) return
    const link = document.createElement('a')
    link.href = `data:application/pdf;base64,${res.pdfBase64}`
    link.download = `analysis-${selectedSurvey}.pdf`
    link.click()
  }

  const openSubmissionModal = (submission: FeedbackSubmission) => {
    setActiveSubmission(submission)
    setSingleAnalysis(null)
    setIsModalOpen(true)
  }

  const closeSubmissionModal = () => {
    setIsModalOpen(false)
    setActiveSubmission(null)
    setSingleAnalysis(null)
  }

  const downloadChartAsPNG = () => {
    const chartContainer = document.querySelector('.recharts-wrapper') as HTMLElement
    if (!chartContainer) return

    // Use html2canvas if available, or fallback to SVG export
    const svg = chartContainer.querySelector('svg')
    if (!svg) return

    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    img.onload = () => {
      canvas.width = img.width
      canvas.height = img.height
      ctx?.drawImage(img, 0, 0)
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `chart-${selectedChart}-${new Date().toISOString().split('T')[0]}.png`
          a.click()
          URL.revokeObjectURL(url)
        }
      })
    }

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      // Refetch submissions using utility function (handles both new and legacy structures)
      const { fetchAllSubmissions } = await import('@/lib/submission-utils')
      const feedbackList = await fetchAllSubmissions()
      setSubmissions(feedbackList)

      // Refetch surveys
      const surveysData = await getSurveys()
      setSurveys(surveysData)
    } catch (e) {
      console.error("Error refreshing data:", e)
    } finally {
      setIsRefreshing(false)
    }
  }

  const clearAllFilters = () => {
    setSearchQuery('')
    setDateRange('all')
    setRatingFilter('all')
    setHospitalFilter('all')
    setSelectedSurvey('all')
    setCurrentPage(1)
  }

  // Export functionality
  const exportToCSV = useCallback(() => {
    const headers = isConsent
      ? ['Date', 'Name', 'Email', 'Phone', 'City', 'Province', 'Primary Hospital', 'SCD Connection', 'May Contact', 'Mailing List', 'Support Groups']
      : ['Date', 'Rating', 'Hospital', 'Department', 'Experience', 'Pain Score', 'Wait Time', 'Length of Stay']

    const rows = filtered.map(sub => {
      if (isConsent) {
        return [
          safeFormatDateForExport(sub.submittedAt, true),
          `${sub.firstName || ''} ${sub.lastName || ''}`.trim(),
          sub.email || '',
          sub.phone || '',
          (sub.city as any)?.selection || sub.city || '',
          (sub.province as any)?.selection || sub.province || '',
          (sub.primaryHospital as any)?.selection || sub.primaryHospital || '',
          Array.isArray(sub.scdConnection) ? sub.scdConnection.join('; ') : sub.scdConnection || '',
          sub.mayContact || '',
          sub.joinMailingList || '',
          sub.joinSupportGroups || ''
        ]
      } else {
        // Get hospital from all possible field variations using the centralized helper
        const hospitalValue = getHospitalOrLocation(sub, false)
        const waitTime = sub.waitTime as any
        const lengthOfStay = sub.lengthOfStay as any

        return [
          safeFormatDateForExport(sub.submittedAt, true),
          sub.rating ?? '',
          hospitalValue,
          sub.department || '',
          sub.hospitalInteraction || '',
          sub.painScore || sub.painLevel || '',
          waitTime ? (typeof waitTime === 'object' ? `${waitTime.hours || 0}h ${waitTime.minutes || 0}m` : waitTime) : '',
          lengthOfStay ? (typeof lengthOfStay === 'object' ? `${lengthOfStay.days || 0}d ${lengthOfStay.hours || 0}h` : lengthOfStay) : ''
        ]
      }
    })

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `${isConsent ? 'consent' : 'feedback'}_export_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }, [filtered, isConsent])

  const exportToExcel = useCallback(() => {
    import('@/lib/export-utils').then(({ exportToXLSX }) => {
      // Prepare comprehensive data for Excel export
      const exportData = filtered.map(sub => {
        const row: any = {
          'Submission ID': sub.id,
          'Date': new Date(sub.submittedAt).toLocaleDateString(),
          'Time': new Date(sub.submittedAt).toLocaleTimeString(),
          'Survey ID': sub.surveyId || '',
        }

        // Add all submission fields dynamically
        Object.entries(sub).forEach(([key, value]) => {
          if (['id', 'submittedAt', 'surveyId'].includes(key)) return

          let formattedValue = value
          if (value === null || value === undefined) {
            formattedValue = ''
          } else if (Array.isArray(value)) {
            formattedValue = value.join('; ')
          } else if (typeof value === 'object' && value !== null) {
            if (value.selection) {
              formattedValue = value.other ? `${value.selection} (${value.other})` : value.selection
            } else if (value.hours !== undefined || value.minutes !== undefined || value.days !== undefined) {
              // Handle time objects
              const parts = []
              if (value.days) parts.push(`${value.days}d`)
              if (value.hours) parts.push(`${value.hours}h`)
              if (value.minutes) parts.push(`${value.minutes}m`)
              formattedValue = parts.join(' ')
            } else {
              formattedValue = JSON.stringify(value)
            }
          }

          // Format field name nicely
          const fieldName = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())
          row[fieldName] = formattedValue
        })

        return row
      })

      const filename = `${isConsent ? 'consent' : 'feedback'}_export_${new Date().toISOString().split('T')[0]}`
      exportToXLSX(exportData, filename)
    })
  }, [filtered, isConsent])

  // Calculate trend compared to previous period
  const calculateTrend = useCallback((currentMetrics: any, previousPeriod: FeedbackSubmission[]) => {
    if (isConsent) return null
    const prevRatings = previousPeriod.filter(s => s.rating != null && !isNaN(Number(s.rating)))
    const prevAvg = prevRatings.length > 0 ? prevRatings.reduce((a, s) => a + Number(s.rating), 0) / prevRatings.length : 0
    const currentAvg = currentMetrics.avg || 0
    const change = prevAvg > 0 ? ((currentAvg - prevAvg) / prevAvg) * 100 : 0
    return {
      change: change.toFixed(1),
      direction: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral',
      previousAvg: prevAvg.toFixed(1)
    }
  }, [isConsent])

  // Get previous period submissions for comparison
  const previousPeriodSubmissions = useMemo(() => {
    if (dateRange === 'all') return []
    const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    const previousStartDate = new Date(startDate)
    previousStartDate.setDate(previousStartDate.getDate() - days)

    return submissions.filter(s => {
      const date = new Date(s.submittedAt)
      return date >= previousStartDate && date < startDate
    })
  }, [submissions, dateRange])

  // Removed duplicate trend calculation - using ratingTrend from above

  const activeFiltersCount = [
    searchQuery.trim() ? 1 : 0,
    dateRange !== 'all' ? 1 : 0,
    ratingFilter !== 'all' ? 1 : 0,
    hospitalFilter !== 'all' ? 1 : 0,
    selectedSurvey !== 'all' ? 1 : 0
  ].reduce((a, b) => a + b, 0)

  // Notification system
  const { notifications, addNotification, removeNotification, clearAllNotifications } = useNotificationCenter()

  // Analytics notifications
  useAnalyticsNotifications(submissions)

  // Keyboard shortcuts for power users
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K: Focus search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        document.querySelector<HTMLInputElement>('input[placeholder*="Search"]')?.focus()
      }
      // Cmd/Ctrl + E: Export data
      if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
        e.preventDefault()
        setShowExportDialog(true)
      }
      // Cmd/Ctrl + R: Refresh
      if ((e.metaKey || e.ctrlKey) && e.key === 'r') {
        e.preventDefault()
        handleRefresh()
      }
      // Escape: Clear filters or close help
      if (e.key === 'Escape') {
        if (showKeyboardHelp) {
          setShowKeyboardHelp(false)
        } else if (activeFiltersCount > 0 && !isModalOpen && !showExportDialog) {
          clearAllFilters()
        }
      }
      // ?: Show keyboard shortcuts
      if (e.key === '?' && !isModalOpen && !showExportDialog) {
        e.preventDefault()
        setShowKeyboardHelp(true)
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [activeFiltersCount, isModalOpen, showExportDialog, showKeyboardHelp])

  // Show loading state
  if (initialLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
          <Loader className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  // Show error state
  if (fetchError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Dashboard</AlertTitle>
          <AlertDescription>
            <p className="mb-2">{fetchError}</p>
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

  // Compute dashboard title and description based on mode
  const dashboardTitle = isAllSurveysMode
    ? 'Survey Overview Dashboard'
    : isConsent
      ? 'Consent Form Submissions'
      : 'Feedback Dashboard';

  const dashboardDescription = isAllSurveysMode
    ? 'High-level insights across all survey submissions'
    : isConsent
      ? 'SCAGO Digital Consent & Information Collection'
      : 'Comprehensive hospital experience analytics';

  return (
    <>
      <NotificationSystem
        notifications={notifications}
        onRemove={removeNotification}
        onClearAll={clearAllNotifications}
      />
      <div className="container mx-auto px-4 py-4 sm:py-8">
        <div className="grid gap-4 sm:gap-6">
          {/* Header with Enhanced Filters */}
          <div className="space-y-3 sm:space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold">
                  {isAllSurveysMode ? 'Survey Overview Dashboard' : isConsent ? 'Consent Form Submissions' : 'Feedback Dashboard'}
                </h1>
                <p className="text-sm sm:text-base text-muted-foreground">
                  {isAllSurveysMode ? 'High-level insights across all survey submissions' : isConsent ? 'SCAGO Digital Consent & Information Collection' : 'Comprehensive hospital experience analytics'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {user?.email && (
                  <p className="text-sm text-muted-foreground hidden sm:inline">
                    Signed in as <span className="font-medium">{user.email}</span>
                  </p>
                )}
                {user && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={async () => {
                      const { error } = await signOut();
                      if (error) {
                        // Handle error if needed
                      } else {
                        window.location.href = '/login';
                      }
                    }}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Sign Out</span>
                    <span className="sm:hidden">Out</span>
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowKeyboardHelp(true)}
                  className="flex items-center gap-2"
                  title="Keyboard shortcuts"
                >
                  <Keyboard className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowExportDialog(true)}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Export Data
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                {activeFiltersCount > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearAllFilters}
                    className="flex items-center gap-2"
                  >
                    <X className="h-4 w-4" />
                    Clear Filters ({activeFiltersCount})
                  </Button>
                )}
              </div>
            </div>

            {/* Advanced Filter Controls */}
            <div className="flex flex-wrap gap-3 p-4 bg-muted/20 rounded-lg border">
              <div className="flex items-center gap-2 relative">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={isConsent ? "Search by name, email, city..." : "Search feedback, hospitals, surveys..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-64 pr-16"
                />
                <kbd className="absolute right-2 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground bg-muted border border-border rounded opacity-60">
                  {typeof navigator !== 'undefined' && navigator.platform.includes('Mac') ? '⌘K' : 'Ctrl+K'}
                </kbd>
              </div>

              <Select onValueChange={setSelectedSurvey} value={selectedSurvey}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by survey" />
                </SelectTrigger>
                <SelectContent>
                  {surveyOptions.map(id => (
                    <SelectItem key={id} value={id}>
                      {id === 'all' ? 'All Surveys' : (surveyTitleMap.get(id) || id)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select onValueChange={(value) => setDateRange(value as 'all' | '7d' | '30d' | '90d')} value={dateRange}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Date range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="7d">Last 7 Days</SelectItem>
                  <SelectItem value="30d">Last 30 Days</SelectItem>
                  <SelectItem value="90d">Last 90 Days</SelectItem>
                </SelectContent>
              </Select>

              {!isConsent && (
                <Select onValueChange={(value) => setRatingFilter(value as 'all' | 'excellent' | 'good' | 'poor')} value={ratingFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Rating filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Ratings</SelectItem>
                    <SelectItem value="excellent">Excellent (8-10)</SelectItem>
                    <SelectItem value="good">Good (5-7)</SelectItem>
                    <SelectItem value="poor">Poor (0-4)</SelectItem>
                  </SelectContent>
                </Select>
              )}

              <Select onValueChange={setHospitalFilter} value={hospitalFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder={isConsent ? "Filter by care location" : "Filter by hospital"} />
                </SelectTrigger>
                <SelectContent>
                  {hospitalOptions.map(hospital => (
                    <SelectItem key={hospital} value={hospital}>
                      {hospital === 'all' ? (isConsent ? 'All Locations' : 'All Hospitals') : hospital}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Active Filters Display */}
            {activeFiltersCount > 0 && (
              <div className="flex flex-wrap gap-2">
                {searchQuery.trim() && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    Search: "{searchQuery}"
                    <X className="h-3 w-3 cursor-pointer" onClick={() => setSearchQuery('')} />
                  </Badge>
                )}
                {dateRange !== 'all' && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    Date: {dateRange === '7d' ? 'Last 7 Days' : dateRange === '30d' ? 'Last 30 Days' : 'Last 90 Days'}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => setDateRange('all')} />
                  </Badge>
                )}
                {ratingFilter !== 'all' && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    Rating: {ratingFilter === 'excellent' ? 'Excellent' : ratingFilter === 'good' ? 'Good' : 'Poor'}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => setRatingFilter('all')} />
                  </Badge>
                )}
                {hospitalFilter !== 'all' && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    Hospital: {hospitalFilter}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => setHospitalFilter('all')} />
                  </Badge>
                )}
                {selectedSurvey !== 'all' && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    Survey: {surveyTitleMap.get(selectedSurvey) || selectedSurvey}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => setSelectedSurvey('all')} />
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" role="region" aria-label="Key metrics overview">
            {/* Card 1: Total Submissions (same for both) */}
            <UCard className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 backdrop-blur-sm border-blue-200/50 dark:border-blue-800/50" role="article" aria-labelledby="submissions-title">
              <CardHeader className="pb-2">
                <CardTitle id="submissions-title" className="text-base flex items-center gap-2 text-blue-900 dark:text-blue-100">
                  <ClipboardList className="h-4 w-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                  Submissions
                </CardTitle>
                <CardDescription>Total responses ({filtered.length} filtered)</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-3xl font-bold text-blue-700 dark:text-blue-300" aria-live="polite">{metrics.total}</div>
              </CardContent>
            </UCard>

            {/* Card 2: Different based on survey type */}
            {isAllSurveysMode ? (
              <UCard className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20 backdrop-blur-sm border-emerald-200/50 dark:border-emerald-800/50" role="article" aria-labelledby="locations-title">
                <CardHeader className="pb-2">
                  <CardTitle id="locations-title" className="text-base flex items-center gap-2 text-emerald-900 dark:text-emerald-100">
                    <MapPin className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                    Active Locations
                  </CardTitle>
                  <CardDescription>Unique cities/hospitals</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-3xl font-bold text-emerald-700 dark:text-emerald-300" aria-live="polite">
                    {(metrics as any).activeLocations || 0}
                  </div>
                </CardContent>
              </UCard>
            ) : isConsent ? (
              <UCard className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20 backdrop-blur-sm border-emerald-200/50 dark:border-emerald-800/50" role="article" aria-labelledby="contact-reach-title">
                <CardHeader className="pb-2">
                  <CardTitle id="contact-reach-title" className="text-base flex items-center gap-2 text-emerald-900 dark:text-emerald-100">
                    <Users className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                    Contact Reach
                  </CardTitle>
                  <CardDescription>Agreed to any contact</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-3xl font-bold text-emerald-700 dark:text-emerald-300" aria-live="polite">
                    {(metrics as any).contactReachPercent || 0}%
                  </div>
                  <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80 mt-1">
                    {(metrics as any).contactReachCount || 0} participants
                  </p>
                </CardContent>
              </UCard>
            ) : (
              <UCard className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20 backdrop-blur-sm border-emerald-200/50 dark:border-emerald-800/50" role="article" aria-labelledby="rating-title">
                <CardHeader className="pb-2">
                  <CardTitle id="rating-title" className="text-base flex items-center gap-2 text-emerald-900 dark:text-emerald-100">
                    <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                    Avg Rating
                  </CardTitle>
                  <CardDescription>Across selection</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-end justify-between">
                    <div className="text-3xl font-bold text-emerald-700 dark:text-emerald-300" aria-live="polite">{(metrics as any).avg || 0}/10</div>
                    {ratingTrend && ratingTrend.direction !== 'neutral' && (
                      <div className={`flex items-center gap-1 text-xs font-medium ${ratingTrend.direction === 'up' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                        }`}>
                        {ratingTrend.direction === 'up' ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                        {ratingTrend.change}%
                      </div>
                    )}
                  </div>
                </CardContent>
              </UCard>
            )}

            {/* Card 3: Different based on survey type */}
            {/* Card 3: Different based on survey type */}
            {isAllSurveysMode ? (
              <UCard className="bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/30 dark:to-purple-900/20 backdrop-blur-sm border-purple-200/50 dark:border-purple-800/50" role="article" aria-labelledby="trend-title">
                <CardHeader className="pb-2">
                  <CardTitle id="trend-title" className="text-base flex items-center gap-2 text-purple-900 dark:text-purple-100">
                    <TrendingUp className="h-4 w-4 text-purple-600 dark:text-purple-400" aria-hidden="true" />
                    Daily Trend
                  </CardTitle>
                  <CardDescription>Vs. Yesterday</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-end justify-between">
                    <div className="text-3xl font-bold text-purple-700 dark:text-purple-300" aria-live="polite">
                      {(() => {
                        const trend = (metrics as any).dailyTrend || 0;
                        return trend > 0 ? `+${trend}%` : `${trend}%`;
                      })()}
                    </div>
                  </div>
                </CardContent>
              </UCard>
            ) : isConsent ? (
              <UCard className="bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/30 dark:to-purple-900/20 backdrop-blur-sm border-purple-200/50 dark:border-purple-800/50" role="article" aria-labelledby="location-title">
                <CardHeader className="pb-2">
                  <CardTitle id="location-title" className="text-base flex items-center gap-2 text-purple-900 dark:text-purple-100">
                    <Building2 className="h-4 w-4 text-purple-600 dark:text-purple-400" aria-hidden="true" />
                    Top Location
                  </CardTitle>
                  <CardDescription>Most common city</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-lg font-bold truncate text-purple-700 dark:text-purple-300" aria-live="polite">
                    {(metrics as any).consentMetrics?.geographicDistribution?.[0]?.city || 'N/A'}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {(metrics as any).consentMetrics?.geographicDistribution?.[0]?.count || 0} submissions
                  </div>
                </CardContent>
              </UCard>
            ) : (
              <UCard className="bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/30 dark:to-purple-900/20 backdrop-blur-sm border-purple-200/50 dark:border-purple-800/50" role="article" aria-labelledby="nps-title">
                <CardHeader className="pb-2">
                  <CardTitle id="nps-title" className="text-base flex items-center gap-2 text-purple-900 dark:text-purple-100">
                    <Activity className="h-4 w-4 text-purple-600 dark:text-purple-400" aria-hidden="true" />
                    NPS Score
                  </CardTitle>
                  <CardDescription>Net Promoter Score</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-3xl font-bold text-purple-700 dark:text-purple-300" aria-live="polite">
                    {(metrics as any).npsScore || 0}
                  </div>
                  <div className="text-xs text-purple-600/80 dark:text-purple-400/80 mt-1">
                    -100 to +100
                  </div>
                </CardContent>
              </UCard>
            )}

          </div>

          {/* Advanced Insights Section - Now Always Visible */}
          <div className="grid gap-4">
            {/* Sentiment Distribution / Consent Preferences - Hide in overview mode */}
            {!isAllSurveysMode && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {isConsent ? (
                  <>
                    <Card key="contact-card" className="bg-blue-50 dark:bg-blue-950/20">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Contact Preferences</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                          {(metrics as any).consentMetrics?.mayContactPercent || 0}%
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {(metrics as any).consentMetrics?.mayContactYes || 0} opted in for contact
                        </p>
                      </CardContent>
                    </Card>
                    <Card key="mailing-card" className="bg-purple-50 dark:bg-purple-950/20">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Mailing List</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                          {(metrics as any).consentMetrics?.joinMailingListPercent || 0}%
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {(metrics as any).consentMetrics?.joinMailingListYes || 0} joined mailing list
                        </p>
                      </CardContent>
                    </Card>
                    <Card key="support-card" className="bg-green-50 dark:bg-green-950/20">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Support Groups</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                          {(metrics as any).consentMetrics?.joinSupportGroupsPercent || 0}%
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {(metrics as any).consentMetrics?.joinSupportGroupsYes || 0} interested in support groups
                        </p>
                      </CardContent>
                    </Card>
                  </>
                ) : (
                  <>
                    <Card key="excellent-card" className="bg-green-50 dark:bg-green-950/20">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Excellent Experience</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                          {Math.round(((metrics as any).excellent / (metrics.total || 1)) * 100)}%
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {(metrics as any).excellent} submissions (8-10 rating)
                        </p>
                      </CardContent>
                    </Card>
                    <Card key="good-card" className="bg-yellow-50 dark:bg-yellow-950/20">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Good Experience</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                          {Math.round(((metrics as any).good / (metrics.total || 1)) * 100)}%
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {(metrics as any).good} submissions (5-7 rating)
                        </p>
                      </CardContent>
                    </Card>
                    <Card key="needs-improvement-card" className="bg-red-50 dark:bg-red-950/20">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Needs Improvement</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                          {Math.round(((metrics as any).needsImprovement / (metrics.total || 1)) * 100)}%
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {(metrics as any).needsImprovement} submissions (0-4 rating)
                        </p>
                      </CardContent>
                    </Card>
                  </>
                )}
              </div>
            )}

            {/* Hospital Rankings and Response Trends - Hide in overview mode */}
            {!isAllSurveysMode && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {isConsent ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Top Care Locations</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {((metrics as any).consentMetrics?.geographicDistribution || []).slice(0, 5).map((row: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-muted-foreground w-6">#{idx + 1}</span>
                              <span className="text-sm truncate max-w-[200px]">{row.city}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                <div
                                  className="h-2 rounded-full bg-primary"
                                  style={{ width: `${Math.min(100, (row.count / (metrics.total || 1)) * 100)}%` }}
                                />
                              </div>
                              <span className="text-sm font-bold w-12 text-right">{row.count}</span>
                            </div>
                          </div>
                        ))}
                        {(((metrics as any).consentMetrics?.geographicDistribution || []).length === 0) && (
                          <p className="text-sm text-muted-foreground">No location data available</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Top Hospitals by Rating</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {((metrics as any).hospitalRatings || []).slice(0, 5).map((hospital: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-muted-foreground w-6">#{idx + 1}</span>
                              <span className="text-sm truncate max-w-[200px]">{hospital.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                <div
                                  className="h-2 rounded-full bg-primary"
                                  style={{ width: `${(parseFloat(hospital.avgRating) / 10) * 100}%` }}
                                />
                              </div>
                              <span className="text-sm font-bold w-12 text-right">{hospital.avgRating}</span>
                            </div>
                          </div>
                        ))}
                        {((metrics as any).hospitalRatings?.length === 0 || !(metrics as any).hospitalRatings) && (
                          <p className="text-sm text-muted-foreground">No hospital data available</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base">Recent {isConsent ? 'Consent Submissions' : 'Feedback Trends'}</CardTitle>
                        <CardDescription className="text-xs mt-1">Latest 10 submissions</CardDescription>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const tableElement = document.getElementById('submissions-table-section')
                          if (tableElement) {
                            tableElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
                          }
                        }}
                        className="text-xs"
                      >
                        View All →
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {filtered.slice(0, 10).map((submission, idx) => (
                        <div
                          key={submission.id}
                          className="flex items-start gap-3 p-2 hover:bg-muted/50 rounded-lg transition-colors cursor-pointer"
                          onClick={() => openSubmissionModal(submission)}
                        >
                          {!isConsent ? (
                            <div className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${Number(submission.rating) >= 8 ? 'bg-green-500' :
                              Number(submission.rating) >= 5 ? 'bg-yellow-500' : 'bg-red-500'
                              }`} />
                          ) : (
                            <div className="mt-1 h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-medium line-clamp-1 flex-1">
                                {isConsent
                                  ? `${(submission as any)?.firstName || ''} ${(submission as any)?.lastName || ''}`.trim() || 'Unnamed'
                                  : submission.hospitalInteraction || 'N/A'}
                              </p>
                              {!isConsent && (() => {
                                const rating = Number(submission.rating)
                                const isValidRating = !isNaN(rating) && rating >= 0 && rating <= 10
                                return isValidRating ? (
                                  <Badge variant="outline" className="text-xs flex-shrink-0">
                                    {rating}/10
                                  </Badge>
                                ) : null
                              })()}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                {surveyTitleMap.get(submission.surveyId) || 'Unknown Survey'}
                              </Badge>
                              <span>•</span>
                              {isConsent
                                ? getHospitalOrLocation(submission, true)
                                : getHospitalOrLocation(submission, false)}
                              <span>•</span>
                              {(() => {
                                const date = submission.submittedAt ? new Date(submission.submittedAt) : null
                                if (!date || isNaN(date.getTime())) return 'Invalid Date'
                                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                              })()}
                            </p>
                          </div>
                        </div>
                      ))}
                      {filtered.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">No submissions to display</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          {/* Dynamic Chart Section */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <CardTitle>Analytics Dashboard</CardTitle>
                  <CardDescription>Interactive charts for key metrics</CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Select value={selectedChart} onValueChange={(value: any) => setSelectedChart(value)}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {isAllSurveysMode ? (
                        <>
                          <SelectItem key="chart-submissions" value="submissions">Submissions Over Time</SelectItem>
                          <SelectItem key="chart-survey-breakdown" value="surveyBreakdown">Survey Breakdown</SelectItem>
                          <SelectItem key="chart-geography" value="geography">Geographic Distribution</SelectItem>
                        </>
                      ) : isConsent ? (
                        <>
                          <SelectItem key="chart-submissions" value="submissions">Submissions Over Time</SelectItem>
                          <SelectItem key="chart-scd-connection" value="scdConnection">SCD Connection Types</SelectItem>
                          <SelectItem key="chart-contact-preferences" value="contactPreferences">Contact Preferences</SelectItem>
                          <SelectItem key="chart-geography" value="geography">Top Locations</SelectItem>
                        </>
                      ) : (
                        <>
                          <SelectItem key="chart-rating" value="rating">Rating Trends</SelectItem>
                          <SelectItem key="chart-pain" value="pain">Pain Scores</SelectItem>
                          <SelectItem key="chart-wait" value="wait">Wait Times</SelectItem>
                          <SelectItem key="chart-stay" value="stay">Length of Stay</SelectItem>
                          <SelectItem key="chart-satisfaction" value="satisfaction">Department Satisfaction</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const csv = [
                        ['Date', 'Hospital', 'Rating', 'Experience', 'Survey ID'],
                        ...filtered.map(s => [
                          safeFormatDateForExport(s.submittedAt),
                          getHospitalOrLocation(s, isConsent),
                          s.rating ?? '',
                          (s.hospitalInteraction || '').replace(/,/g, ';'),
                          s.surveyId
                        ])
                      ].map(row => row.join(',')).join('\n')

                      const blob = new Blob([csv], { type: 'text/csv' })
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = `feedback-export-${new Date().toISOString().split('T')[0]}.csv`
                      a.click()
                    }}
                  >
                    Export CSV
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.print()}
                  >
                    Print
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadChartAsPNG}
                    title="Download current chart as PNG"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <div className="h-80 w-full">
                {/* Overview charts */}
                {isAllSurveysMode && selectedChart === 'submissions' && (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={submissionsOverTime} margin={{ top: 10, right: 30, left: 0, bottom: 40 }}>
                      <defs>
                        <linearGradient id="colorSubmissions" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 12 }}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis
                        tick={{ fontSize: 12 }}
                        label={{ value: 'All Submissions', angle: -90, position: 'insideLeft' }}
                      />
                      <Tooltip />
                      <Area
                        type="monotone"
                        dataKey="count"
                        stroke="hsl(var(--primary))"
                        fillOpacity={1}
                        fill="url(#colorSubmissions)"
                        name="Submissions"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}

                {isAllSurveysMode && selectedChart === 'surveyBreakdown' && (
                  (chartData as any).surveyBreakdown?.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={(chartData as any).surveyBreakdown}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={5}
                          dataKey="count"
                          nameKey="surveyTitle"
                        >
                          {(chartData as any).surveyBreakdown.map((_: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#ec4899"][index % 6]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">No survey data available</div>
                  )
                )}

                {isAllSurveysMode && selectedChart === 'geography' && (
                  (chartData as any).geography?.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={(chartData as any).geography} margin={{ top: 10, right: 30, left: 0, bottom: 80 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                        <XAxis
                          dataKey="location"
                          tick={{ fontSize: 12 }}
                          angle={-45}
                          textAnchor="end"
                          height={100}
                        />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Bar dataKey="count" name="Submissions" fill="#8b5cf6" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">No geographic data available</div>
                  )
                )}

                {/* Consent charts */}
                {isConsent && selectedChart === 'submissions' && (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={submissionsOverTime} margin={{ top: 10, right: 30, left: 0, bottom: 40 }}>
                      <defs>
                        <linearGradient id="colorSubmissionsConsent" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 12 }}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis
                        tick={{ fontSize: 12 }}
                        label={{ value: 'Submissions', angle: -90, position: 'insideLeft' }}
                      />
                      <Tooltip />
                      <Area
                        type="monotone"
                        dataKey="count"
                        stroke="hsl(var(--primary))"
                        fillOpacity={1}
                        fill="url(#colorSubmissionsConsent)"
                        name="Submissions"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}

                {isConsent && selectedChart === 'scdConnection' && (
                  (chartData as any).scdConnection?.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={(chartData as any).scdConnection} margin={{ top: 10, right: 30, left: 0, bottom: 80 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                        <XAxis
                          dataKey="type"
                          tick={{ fontSize: 12 }}
                          angle={-45}
                          textAnchor="end"
                          height={100}
                        />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Bar dataKey="count" name="Count" fill="#3b82f6" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">No SCD connection data available</div>
                  )
                )}

                {isConsent && selectedChart === 'contactPreferences' && (
                  (chartData as any).contactPreferences?.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={(chartData as any).contactPreferences} margin={{ top: 10, right: 30, left: 0, bottom: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                        <XAxis dataKey="preference" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Bar dataKey="count" name="Count">
                          {(chartData as any).contactPreferences.map((_: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={["#0ea5e9", "#8b5cf6", "#10b981", "#f59e0b"][index % 4]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">No contact preference data available</div>
                  )
                )}

                {isConsent && selectedChart === 'geography' && (
                  (chartData as any).geography?.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={(chartData as any).geography} margin={{ top: 10, right: 30, left: 0, bottom: 80 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                        <XAxis dataKey="city" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={100} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Bar dataKey="count" name="Submissions" fill="#10b981" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">No location data available</div>
                  )
                )}

                {/* Feedback charts */}
                {!isConsent && selectedChart === 'rating' && (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={ratingOverTime} margin={{ top: 10, right: 30, left: 0, bottom: 40 }}>
                      <defs>
                        <linearGradient id="colorRating" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 12 }}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis
                        domain={[0, 10]}
                        tick={{ fontSize: 12 }}
                        label={{ value: 'Rating', angle: -90, position: 'insideLeft' }}
                      />
                      <Tooltip />
                      <Area
                        type="monotone"
                        dataKey="avg"
                        stroke="hsl(var(--primary))"
                        fillOpacity={1}
                        fill="url(#colorRating)"
                        name="Avg Rating"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}

                {!isConsent && selectedChart === 'pain' && (
                  chartData.painScores.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData.painScores} margin={{ top: 10, right: 30, left: 0, bottom: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                        <XAxis
                          dataKey="score"
                          tick={{ fontSize: 12 }}
                          label={{ value: 'Pain Score (0-10)', position: 'insideBottom', offset: -5 }}
                        />
                        <YAxis
                          tick={{ fontSize: 12 }}
                          label={{ value: 'Number of Patients', angle: -90, position: 'insideLeft' }}
                        />
                        <Tooltip />
                        <Bar dataKey="count" name="Patients">
                          {chartData.painScores.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={
                              entry.score <= 3 ? '#10b981' :
                                entry.score <= 6 ? '#f59e0b' : '#ef4444'
                            } />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      No pain score data available
                    </div>
                  )
                )}

                {!isConsent && selectedChart === 'wait' && (
                  chartData.waitTimes.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData.waitTimes}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={2}
                          dataKey="count"
                          nameKey="category"
                        >
                          {chartData.waitTimes.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={
                              ['#10b981', '#34d399', '#f59e0b', '#fb923c', '#ef4444', '#dc2626'][index % 6]
                            } />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      No wait time data available
                    </div>
                  )
                )}

                {!isConsent && selectedChart === 'stay' && (
                  chartData.stayLength.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData.stayLength}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={2}
                          dataKey="count"
                          nameKey="category"
                        >
                          {chartData.stayLength.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={
                              ['#3b82f6', '#60a5fa', '#93c5fd', '#dbeafe', '#eff6ff'][index % 5]
                            } />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      No length of stay data available
                    </div>
                  )
                )}

                {!isConsent && selectedChart === 'satisfaction' && (
                  chartData.departmentSatisfaction.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData.departmentSatisfaction} margin={{ top: 10, right: 30, left: 0, bottom: 80 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                        <XAxis
                          dataKey="department"
                          tick={{ fontSize: 11 }}
                          angle={-45}
                          textAnchor="end"
                          height={100}
                        />
                        <YAxis
                          domain={[0, 10]}
                          tick={{ fontSize: 12 }}
                          label={{ value: 'Average Rating', angle: -90, position: 'insideLeft' }}
                        />
                        <Tooltip />
                        <Bar dataKey="avgRating" name="Avg Rating">
                          {chartData.departmentSatisfaction.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={
                              parseFloat(entry.avgRating) >= 8 ? '#10b981' :
                                parseFloat(entry.avgRating) >= 5 ? '#f59e0b' : '#ef4444'
                            } />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      No department satisfaction data available
                    </div>
                  )
                )}
              </div>

              {/* Chart Description */}
              <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  {isConsent && selectedChart === 'submissions' && 'Shows the number of consent submissions over time.'}
                  {isConsent && selectedChart === 'scdConnection' && 'Breakdown of users\' connection to SCD (patient, caregiver, HCP, etc.).'}
                  {isConsent && selectedChart === 'contactPreferences' && 'Counts of users opting into contact, mailing list, support groups, and advocacy.'}
                  {isConsent && selectedChart === 'geography' && 'Top cities represented in consent submissions.'}
                  {!isConsent && selectedChart === 'rating' && 'Shows the average rating trend over time for all submissions.'}
                  {!isConsent && selectedChart === 'pain' && 'Distribution of pain scores reported by patients (0 = no pain, 10 = severe pain).'}
                  {!isConsent && selectedChart === 'wait' && 'Breakdown of emergency department wait times across different time ranges.'}
                  {!isConsent && selectedChart === 'stay' && 'Distribution of patient length of stay in the hospital.'}
                  {!isConsent && selectedChart === 'satisfaction' && 'Average satisfaction ratings by hospital department.'}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-[#C8262A]" />
                Smart Report Generation
              </CardTitle>
              <CardDescription>
                create customizable PDF reports with high-level insights and data summaries
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-4">
                <Button onClick={handleAnalyzeFeedback} disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    'Prepare Report'
                  )}
                </Button>
                {typeof analysis === 'string' && analysis.length > 0 && (
                  <Button
                    className="bg-gradient-to-br from-[#C8262A] to-[#D34040] hover:from-[#C8262A]/90 hover:to-[#D34040]/90 text-white"
                    size="default"
                    onClick={async () => {
                      const res = await generateAnalysisPdf({
                        title: 'Comprehensive Feedback Report',
                        surveyId: selectedSurvey === 'all' ? 'all' : selectedSurvey,
                        analysisMarkdown: analysis,
                        includeSubmissions: true
                      })
                      if (res.error || !res.pdfBase64) return
                      const link = document.createElement('a')
                      link.href = `data:application/pdf;base64,${res.pdfBase64}`
                      link.download = `comprehensive-report-${selectedSurvey}.pdf`
                      link.click()
                    }}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download Report
                  </Button>
                )}
              </div>
              {error && (
                <Alert variant="destructive" className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Analysis Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              {analysis && (
                <div className="mt-6">
                  <AnalysisDisplay analysisText={analysis} />
                </div>
              )}
            </CardContent>
          </Card>
          <Card id="submissions-table-section" className="border-t-4 border-t-[#C8262A]">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-bold flex items-center gap-2">
                    <ClipboardList className="h-5 w-5 text-[#C8262A]" />
                    Recent Submissions
                  </CardTitle>
                  <CardDescription className="text-sm mt-1">
                    Showing {paginatedSubmissions.length} of {filtered.length} submissions
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowExportDialog(true)}
                    className="flex items-center gap-2 bg-gradient-to-r from-[#C8262A]/10 to-[#D34040]/10 hover:from-[#C8262A]/20 hover:to-[#D34040]/20 border-[#C8262A]/30 text-[#C8262A] hover:text-[#C8262A] font-medium"
                  >
                    <Download className="h-4 w-4" />
                    Export Submissions
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 sm:p-6">
              {/* Mobile Card View */}
              <div className="block md:hidden">
                {paginatedSubmissions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center space-y-4 py-8 px-4">
                    <div className="rounded-full bg-muted p-6">
                      <ClipboardList className="h-12 w-12 text-muted-foreground" />
                    </div>
                    <div className="space-y-2 text-center">
                      <h3 className="text-lg font-semibold">No submissions found</h3>
                      <p className="text-sm text-muted-foreground max-w-md">
                        {activeFiltersCount > 0
                          ? "Try adjusting your filters to see more results"
                          : isConsent
                            ? "Consent form submissions will appear here once participants start filling them out"
                            : "Feedback submissions will appear here once patients start submitting their experiences"
                        }
                      </p>
                    </div>
                    {activeFiltersCount > 0 && (
                      <Button variant="outline" onClick={clearAllFilters} className="mt-4">
                        Clear All Filters
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3 p-4">
                    {paginatedSubmissions.map(submission => {
                      const date = submission.submittedAt ? new Date(submission.submittedAt) : null;
                      const dateStr = date && !isNaN(date.getTime())
                        ? date.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                        : 'Invalid Date';

                      return (
                        <Card key={submission.id} className="border-l-4 border-l-primary">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <Badge variant="outline" className="font-normal mb-2">
                                  {getSurveyDisplayName(submission.surveyId)}
                                </Badge>
                                <p className="text-xs text-muted-foreground">{dateStr}</p>
                              </div>
                              <Button size="sm" variant="outline" onClick={() => openSubmissionModal(submission)}>
                                View
                              </Button>
                            </div>
                            {isConsent ? (
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Name:</span>
                                  <span className="font-medium">{`${(submission as any)?.firstName || ''} ${(submission as any)?.lastName || ''}`.trim() || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Email:</span>
                                  <span className="font-medium truncate ml-2">{(submission as any)?.email || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">City:</span>
                                  <span className="font-medium">{getHospitalOrLocation(submission, true)}</span>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between items-center">
                                  <span className="text-muted-foreground">Rating:</span>
                                  <div className="flex items-center gap-2">
                                    {(() => {
                                      const rating = Number(submission.rating);
                                      const isValidRating = !isNaN(rating) && rating >= 0 && rating <= 10;
                                      return (
                                        <>
                                          <div className={`h-2 w-2 rounded-full ${isValidRating && rating >= 8 ? 'bg-green-500' :
                                            isValidRating && rating >= 5 ? 'bg-yellow-500' : 'bg-red-500'
                                            }`} />
                                          <span className="font-semibold">{isValidRating ? `${rating}/10` : 'N/A'}</span>
                                        </>
                                      );
                                    })()}
                                  </div>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Hospital:</span>
                                  <span className="font-medium">{getHospitalOrLocation(submission, false)}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Experience:</span>
                                  <p className="font-medium text-xs mt-1 line-clamp-2">{submission.hospitalInteraction || 'N/A'}</p>
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
              {/* Desktop Table View */}
              <div className="hidden md:block">
                <div className="overflow-x-auto">
                  <Table className="min-w-[800px]">
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead className="whitespace-nowrap text-sm font-semibold py-4">Date</TableHead>
                        <TableHead className="whitespace-nowrap text-sm font-semibold py-4">Survey</TableHead>
                        {isConsent ? (
                          <>
                            <TableHead className="whitespace-nowrap text-sm font-semibold py-4">Name</TableHead>
                            <TableHead className="whitespace-nowrap text-sm font-semibold py-4">Email</TableHead>
                            <TableHead className="whitespace-nowrap text-sm font-semibold py-4">Location</TableHead>
                          </>
                        ) : (
                          <>
                            <TableHead className="whitespace-nowrap text-sm font-semibold py-4">Name</TableHead>
                            <TableHead className="whitespace-nowrap text-sm font-semibold py-4">Rating</TableHead>
                            <TableHead className="whitespace-nowrap text-sm font-semibold py-4">Hospital</TableHead>
                            <TableHead className="whitespace-nowrap text-sm font-semibold py-4 min-w-[200px]">Experience</TableHead>
                          </>
                        )}
                        <TableHead className="text-right whitespace-nowrap sticky right-0 bg-background text-sm font-semibold py-4">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedSubmissions.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={isConsent ? 5 : 4} className="h-64 text-center">
                            <div className="flex flex-col items-center justify-center space-y-4 py-8">
                              <div className="rounded-full bg-muted p-6">
                                <ClipboardList className="h-12 w-12 text-muted-foreground" />
                              </div>
                              <div className="space-y-2">
                                <h3 className="text-lg font-semibold">No submissions found</h3>
                                <p className="text-sm text-muted-foreground max-w-md">
                                  {activeFiltersCount > 0
                                    ? "Try adjusting your filters to see more results"
                                    : isConsent
                                      ? "Consent form submissions will appear here once participants start filling them out"
                                      : "Feedback submissions will appear here once patients start submitting their experiences"
                                  }
                                </p>
                              </div>
                              {activeFiltersCount > 0 && (
                                <Button variant="outline" onClick={clearAllFilters} className="mt-4">
                                  Clear All Filters
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedSubmissions.map(submission => (
                          <TableRow key={submission.id} className="hover:bg-muted/20">
                            <TableCell className="whitespace-nowrap py-4 text-sm">
                              {(() => {
                                const date = submission.submittedAt ? new Date(submission.submittedAt) : null
                                if (!date || isNaN(date.getTime())) return 'Invalid Date'
                                return date.toLocaleString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })
                              })()}
                            </TableCell>
                            <TableCell className="py-4">
                              <Badge variant="outline" className="font-medium text-sm">
                                {getSurveyDisplayName(submission.surveyId)}
                              </Badge>
                            </TableCell>
                            {isConsent ? (
                              <>
                                <TableCell className="py-4 text-sm font-medium text-foreground">
                                  {`${(submission as any)?.firstName || ''} ${(submission as any)?.lastName || ''}`.trim() || 'N/A'}
                                </TableCell>
                                <TableCell className="py-4 text-sm">{(submission as any)?.email || 'N/A'}</TableCell>
                                <TableCell className="py-4 text-sm">{getHospitalOrLocation(submission, true)}</TableCell>
                              </>
                            ) : (
                              <>
                                <TableCell className="py-4 text-sm font-medium text-foreground">
                                  {((submission as any)?.firstName || (submission as any)?.name)
                                    ? `${(submission as any)?.firstName || ''} ${(submission as any)?.lastName || (submission as any)?.name || ''}`.trim()
                                    : <span className="text-sm italic text-muted-foreground">Anonymous</span>}
                                </TableCell>
                                <TableCell className="py-4">
                                  <div className="flex items-center gap-2">
                                    {(() => {
                                      const rating = Number(submission.rating)
                                      const isValidRating = !isNaN(rating) && rating >= 0 && rating <= 10
                                      return (
                                        <>
                                          <div className={`h-2.5 w-2.5 rounded-full ${isValidRating && rating >= 8 ? 'bg-green-500' :
                                            isValidRating && rating >= 5 ? 'bg-yellow-500' : 'bg-red-500'
                                            }`} />
                                          <span className="text-sm font-medium">{isValidRating ? `${rating}/10` : 'N/A'}</span>
                                        </>
                                      )
                                    })()}
                                  </div>
                                </TableCell>
                                <TableCell className="py-4 text-sm font-medium">{getHospitalOrLocation(submission, false)}</TableCell>
                                <TableCell className="max-w-xs truncate py-4 text-sm">{submission.hospitalInteraction || 'N/A'}</TableCell>
                              </>
                            )}
                            <TableCell className="text-right sticky right-0 bg-background py-4">
                              <div className="flex justify-end gap-2">
                                <Button size="sm" variant="outline" onClick={() => openSubmissionModal(submission)}>View</Button>
                                <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={(e) => { e.stopPropagation(); setSubmissionToDelete(submission); }}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-6 border-t">
                  <p className="text-sm text-muted-foreground order-2 sm:order-1">
                    Showing <span className="font-medium">{(currentPage - 1) * SUBMISSIONS_PER_PAGE + 1}</span> to <span className="font-medium">{Math.min(currentPage * SUBMISSIONS_PER_PAGE, filtered.length)}</span> of <span className="font-medium">{filtered.length}</span> submissions
                  </p>
                  <Pagination className="justify-end order-1 sm:order-2">
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          href="#"
                          onClick={(e) => { e.preventDefault(); if (currentPage > 1) handlePageChange(currentPage - 1); }}
                          className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>

                      {/* Page numbers */}
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum: number;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }

                        return (
                          <PaginationItem key={pageNum}>
                            <PaginationLink
                              href="#"
                              isActive={currentPage === pageNum}
                              onClick={(e) => { e.preventDefault(); handlePageChange(pageNum); }}
                              className="cursor-pointer"
                            >
                              {pageNum}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      })}

                      <PaginationItem>
                        <PaginationNext
                          href="#"
                          onClick={(e) => { e.preventDefault(); if (currentPage < totalPages) handlePageChange(currentPage + 1); }}
                          className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
              <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="w-[95vw] max-w-3xl max-h-[90vh] overflow-hidden flex flex-col bg-white dark:bg-gray-900 p-0 gap-0">
                  {/* Red Header with Submission Details */}
                  <div className="bg-[#C8262A] text-white px-6 py-5">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <h2 className="text-xl font-bold">
                          {isConsent
                            ? `${(activeSubmission as any)?.firstName || ''} ${(activeSubmission as any)?.lastName || ''}`.trim() || 'Anonymous Submission'
                            : `${(activeSubmission as any)?.firstName || ''} ${(activeSubmission as any)?.lastName || (activeSubmission as any)?.name || ''}`.trim() || 'Anonymous Submission'
                          }
                        </h2>
                        {/* Subtitle with Hospital/Location info */}
                        {isConsent ? (
                          <p className="text-lg font-medium text-white/95">
                            {activeSubmission ? getHospitalOrLocation(activeSubmission, true) : 'Unknown Location'}
                          </p>
                        ) : (
                          <p className="text-lg font-medium text-white/95">
                            {activeSubmission ? getHospitalOrLocation(activeSubmission, false) : 'Unknown Hospital'}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-3 text-sm text-white/90">
                          <span className="flex items-center gap-1.5">
                            <Calendar className="h-4 w-4" />
                            {activeSubmission && new Date(activeSubmission.submittedAt).toLocaleDateString('en-US', {
                              year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                            })}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <ClipboardList className="h-4 w-4" />
                            {getSurveyDisplayName(activeSubmission?.surveyId)}
                          </span>
                        </div>
                      </div>
                      {!isConsent && activeSubmission?.rating !== undefined && (
                        <div className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${activeSubmission.rating >= 8 ? 'bg-green-500 text-white' :
                          activeSubmission.rating >= 5 ? 'bg-yellow-500 text-white' :
                            'bg-white text-[#C8262A]'
                          }`}>
                          Rating: {activeSubmission.rating}/10
                        </div>
                      )}
                    </div>
                  </div>
                  <DialogHeader className="sr-only">
                    <DialogTitle>Submission Details</DialogTitle>
                    <DialogDescription>View submission information</DialogDescription>
                  </DialogHeader>
                  {activeSubmission && (
                    <div className="flex-1 overflow-y-auto bg-white dark:bg-gray-900">
                      {/* Modernized Submission Details Interface - Clean Q&A Layout */}
                      <div className="space-y-5 px-6 py-5">
                        {/* Experience Highlight Box */}
                        {activeSubmission.hospitalInteraction && (
                          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border-l-4 border-[#C8262A]">
                            <h3 className="text-sm font-semibold text-[#C8262A] mb-2 uppercase tracking-wide">
                              Patient Experience
                            </h3>
                            <p className="text-gray-700 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">
                              {activeSubmission.hospitalInteraction}
                            </p>
                          </div>
                        )}

                        {/* All Submission Data - Question on top, Answer below */}
                        {Object.entries(activeSubmission)
                          .filter(([key]) => !['id', 'submittedAt', 'surveyId', 'rating', 'hospitalInteraction', 'userId', 'sessionId'].includes(key))
                          .sort((a, b) => a[0].localeCompare(b[0]))
                          .map(([key, value]) => {
                            const question = getQuestionText(key);
                            const formattedValue = formatAnswerValue(value);

                            // Skip empty values
                            if (!formattedValue || (Array.isArray(formattedValue) && formattedValue.length === 0)) return null;
                            if (formattedValue === 'N/A' || formattedValue === '') return null;

                            return (
                              <div key={key} className="border-b border-gray-100 dark:border-gray-700 pb-4 last:border-b-0">
                                <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">
                                  {question}
                                </h4>
                                <div className="text-base text-gray-900 dark:text-gray-100">
                                  {Array.isArray(formattedValue) ? (
                                    <div className="flex flex-wrap gap-2">
                                      {formattedValue.map((v, i) => (
                                        <span
                                          key={i}
                                          className="inline-block bg-[#C8262A]/10 text-[#C8262A] px-3 py-1 rounded-full text-sm font-medium"
                                        >
                                          {v}
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <span>{formattedValue}</span>
                                  )}
                                </div>
                              </div>
                            )
                          })
                        }
                      </div>

                      {/* Raw Data Collapsible */}
                      <details className="mx-6 mb-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-4">
                        <summary className="cursor-pointer text-sm text-gray-500 dark:text-gray-400 font-medium hover:text-gray-700 dark:hover:text-gray-300">
                          View Raw JSON Data
                        </summary>
                        <pre className="mt-3 max-h-48 overflow-auto rounded-lg bg-gray-100 dark:bg-gray-900 p-3 text-xs font-mono text-gray-600 dark:text-gray-400">
                          {JSON.stringify(activeSubmission, null, 2)}
                        </pre>
                      </details>
                    </div>
                  )}
                  <DialogFooter className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 px-6 py-4 bg-gray-50 dark:bg-gray-800 flex flex-wrap items-center justify-between gap-3">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setSubmissionToDelete(activeSubmission)}
                      className="bg-[#C8262A] hover:bg-[#a51f22]"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (!activeSubmission) return
                          const csv = [
                            ['Field', 'Value'],
                            ['Date', safeFormatDateForExport(activeSubmission.submittedAt)],
                            ...Object.entries(activeSubmission)
                              .filter(([key]) => !['id', 'submittedAt', 'surveyId'].includes(key))
                              .map(([key, value]) => [
                                getQuestionText(key),
                                Array.isArray(value)
                                  ? value.join('; ')
                                  : typeof value === 'object'
                                    ? JSON.stringify(value)
                                    : String(value)
                              ])
                          ].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')

                          const blob = new Blob([csv], { type: 'text/csv' })
                          const url = URL.createObjectURL(blob)
                          const a = document.createElement('a')
                          a.href = url
                          a.download = `submission-${activeSubmission.id}.csv`
                          a.click()
                        }}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                      <Button
                        onClick={closeSubmissionModal}
                        className="bg-gray-600 hover:bg-gray-700 text-white"
                      >
                        Close
                      </Button>
                    </div>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Floating AI Chat Button hidden for now */}
      {/* 
      <FloatingChatButton
        onSendQuery={async (query: string) => {
          const { chatWithFeedbackData } = await import('./actions');
          const result = await chatWithFeedbackData(query, selectedSurvey);
          if (result.error) {
            throw new Error(result.error);
          }
          return result.response || 'No response received.';
        }}
        surveyId={selectedSurvey}
        surveyType={(isAllSurveysMode ? 'overview' : (isConsent ? 'consent' : 'feedback')) as 'overview' | 'consent' | 'feedback'}
      />
      */}
      <ConfirmDialog
        open={!!submissionToDelete}
        onOpenChange={(open) => !open && setSubmissionToDelete(null)}
        onConfirm={handleDeleteSubmission}
        title="Delete Submission?"
        description="Are you sure you want to delete this submission? This action cannot be undone."
        confirmText="Delete"
        variant="destructive"
      />

      {/* Export Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Export Data</DialogTitle>
            <DialogDescription>
              Download {isConsent ? 'consent form' : 'feedback'} submissions in CSV or Excel format
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                This will export <span className="font-semibold text-foreground">{filtered.length}</span> submissions based on your current filters.
              </p>
              <div className="rounded-lg bg-muted p-3 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>Date Range:</span>
                  <span className="font-medium">{dateRange === 'all' ? 'All Time' : dateRange === '7d' ? 'Last 7 Days' : dateRange === '30d' ? 'Last 30 Days' : 'Last 90 Days'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Survey:</span>
                  <span className="font-medium">{selectedSurvey === 'all' ? 'All Surveys' : surveyTitleMap.get(selectedSurvey) || selectedSurvey}</span>
                </div>
                {!isConsent && ratingFilter !== 'all' && (
                  <div className="flex justify-between">
                    <span>Rating:</span>
                    <span className="font-medium">{ratingFilter === 'excellent' ? 'Excellent (8-10)' : ratingFilter === 'good' ? 'Good (5-7)' : 'Poor (0-4)'}</span>
                  </div>
                )}
                {hospitalFilter !== 'all' && (
                  <div className="flex justify-between">
                    <span>{isConsent ? 'Location' : 'Hospital'}:</span>
                    <span className="font-medium">{hospitalFilter}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowExportDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                exportToCSV()
                setShowExportDialog(false)
              }}
              variant="outline"
              className="flex items-center gap-2"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Export CSV
            </Button>
            <Button
              onClick={() => {
                exportToExcel()
                setShowExportDialog(false)
              }}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export Excel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Keyboard Shortcuts Help Dialog */}
      <Dialog open={showKeyboardHelp} onOpenChange={setShowKeyboardHelp}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Keyboard className="h-5 w-5" />
              Keyboard Shortcuts
            </DialogTitle>
            <DialogDescription>
              Use these shortcuts to navigate faster
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-sm">Focus search</span>
                <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg dark:bg-gray-600 dark:text-gray-100 dark:border-gray-500">
                  {typeof navigator !== 'undefined' && navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'} + K
                </kbd>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-sm">Export data</span>
                <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg dark:bg-gray-600 dark:text-gray-100 dark:border-gray-500">
                  {typeof navigator !== 'undefined' && navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'} + E
                </kbd>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-sm">Refresh data</span>
                <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg dark:bg-gray-600 dark:text-gray-100 dark:border-gray-500">
                  {typeof navigator !== 'undefined' && navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'} + R
                </kbd>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-sm">Clear all filters</span>
                <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg dark:bg-gray-600 dark:text-gray-100 dark:border-gray-500">
                  Esc
                </kbd>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm">Show shortcuts</span>
                <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg dark:bg-gray-600 dark:text-gray-100 dark:border-gray-500">
                  ?
                </kbd>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowKeyboardHelp(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
