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
  TrendingUp as TrendingUpIcon, TrendingDown, Minus, ArrowUpRight, ArrowDownRight, Keyboard
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
import { Line, LineChart, CartesianGrid, XAxis, YAxis, Bar, BarChart, Pie, PieChart, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { Card as UCard } from '@/components/ui/card'
import { ClipboardList, TrendingUp, Gauge, BarChart3, Search, Filter, X, RefreshCw, MessageSquare } from 'lucide-react'
import { FeedbackSubmission } from './types'
import { analyzeFeedback, generateAnalysisPdf } from './actions'
import ReactMarkdown from 'react-markdown'
import Link from 'next/link'
import { useNotificationCenter, useAnalyticsNotifications } from '@/hooks/use-notifications'
import { NotificationSystem } from '@/components/notification-system'
import FloatingChatButton from '@/components/floating-chat-button'
import AnalysisDisplay from '@/components/analysis-display'
// Firestore imports removed - now using utility functions from @/lib/submission-utils
import { getSurveys } from '../actions'
import { useAuth } from '@/hooks/use-auth'
import { signOut } from '@/lib/firebase-auth'
import { LogOut } from 'lucide-react'

const SUBMISSIONS_PER_PAGE = 10

// Helper function to detect if submissions are from consent survey
function isConsentSurvey(submissions: FeedbackSubmission[]): boolean {
  if (submissions.length === 0) return false
  const sample = submissions[0] as any
  // Check for consent-specific fields
  return !!(sample.digitalSignature || sample.ageConfirmation || sample.scdConnection || sample.primaryHospital)
}

export default function Dashboard() {
  const { user } = useAuth()
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

  const surveyOptions = useMemo(() => {
    // Show all existing surveys in the dropdown, not just ones with submissions
    const allSurveyIds = surveys.map(s => s.id)
    return ['all', ...allSurveyIds]
  }, [surveys])

  const surveyTitleMap = useMemo(() => {
    const map = new Map<string, string>()
    surveys.forEach(survey => {
      map.set(survey.id, survey.title)
    })
    return map
  }, [surveys])

  const hospitalOptions = useMemo(() => {
    const hospitals = Array.from(new Set(submissions.map(s => 
      (s as any).hospital || (s as any)['hospital-on']?.selection || 'Unknown Hospital'
    )))
    return ['all', ...hospitals]
  }, [submissions])

  // Fetch data on mount
  useEffect(() => {
    async function fetchData() {
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
  }, [])

  // Reset selectedSurvey if it's no longer valid (e.g., survey was deleted)
  useEffect(() => {
    if (selectedSurvey !== 'all' && !surveyOptions.includes(selectedSurvey)) {
      setSelectedSurvey('all')
    }
  }, [selectedSurvey, surveyOptions])

  // Detect if we're in "All Surveys" overview mode
  const isAllSurveysMode = selectedSurvey === 'all'

  // Detect if current filtered data is consent survey
  const isConsent = useMemo(() => {
    if (isAllSurveysMode) return false // Overview mode is neither consent nor feedback
    return isConsentSurvey(submissions.filter(s => s.surveyId === selectedSurvey))
  }, [submissions, selectedSurvey, isAllSurveysMode])

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

    // Filter by survey
    if (selectedSurvey !== 'all') {
      result = result.filter(s => s.surveyId === selectedSurvey)
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
            ((s as any).city?.selection || '').toLowerCase().includes(query) ||
            (s.surveyId || '').toLowerCase().includes(query)
          )
        } else {
          // Search feedback-specific fields
          return (
            (s.hospitalInteraction || '').toLowerCase().includes(query) ||
            ((s as any).hospital || '').toLowerCase().includes(query) ||
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

    // Filter by hospital (works for both consent and feedback surveys)
    if (hospitalFilter !== 'all') {
      result = result.filter(s => {
        const hospital = (s as any).hospital || 
                        (s as any)['hospital-on']?.selection || 
                        (s as any).primaryHospital?.selection || 
                        'Unknown Hospital'
        return hospital === hospitalFilter
      })
    }

    return result
  }, [submissions, surveys, selectedSurvey, searchQuery, dateRange, ratingFilter, hospitalFilter])

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
      
      const key = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString().slice(0,10)
      const current = byDate.get(key) || { date: key, avg: 0, count: 0 }
      const nextCount = current.count + 1
      const ratingValue = Number(s.rating)
      const nextAvg = (current.avg * current.count + (isNaN(ratingValue) ? 0 : ratingValue)) / nextCount
      byDate.set(key, { date: key, avg: nextAvg, count: nextCount })
    }
    return Array.from(byDate.values()).sort((a,b) => a.date.localeCompare(b.date))
  }, [filtered])

  const metrics = useMemo(() => {
    const total = filtered.length
    // Count unique surveys from all submissions (including those without matching survey docs)
    // Filter out undefined/null surveyIds to avoid counting them
    const surveysCount = new Set(submissions.map(s => s.surveyId).filter(id => id != null)).size
    
    // Overview mode: High-level metrics across all surveys
    if (isAllSurveysMode) {
      // Count submissions by survey
      const bySurvey = new Map<string, number>()
      filtered.forEach(s => {
        bySurvey.set(s.surveyId, (bySurvey.get(s.surveyId) || 0) + 1)
      })
      
      // Geographic distribution (works for both consent and feedback)
      const geographicDistribution = new Map<string, number>()
      filtered.forEach(s => {
        const location = (s as any).city?.selection || 
                        (s as any).primaryHospital?.selection || 
                        (s as any).hospital || 
                        (s as any)['hospital-on']?.selection || 
                        'Unknown'
        geographicDistribution.set(location, (geographicDistribution.get(location) || 0) + 1)
      })
      
      // Time-based analysis
      const now = new Date()
      const last7Days = filtered.filter(s => {
        const date = new Date(s.submittedAt)
        const diffTime = now.getTime() - date.getTime()
        const diffDays = diffTime / (1000 * 60 * 60 * 24)
        return diffDays <= 7
      }).length
      
      const last30Days = filtered.filter(s => {
        const date = new Date(s.submittedAt)
        const diffTime = now.getTime() - date.getTime()
        const diffDays = diffTime / (1000 * 60 * 60 * 24)
        return diffDays <= 30
      }).length
      
      return {
        total,
        surveysCount,
        last7Days,
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
        const city = (s as any).city?.selection || 'Unknown'
        geographicDistribution.set(city, (geographicDistribution.get(city) || 0) + 1)
      }
      
      return {
        total,
        surveysCount,
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
      for (const s of validRatings) {
        const r = Number(s.rating)
        if (r >= 8) excellent++
        else if (r >= 5) good++
        else needsImprovement++
      }
      
      // Group ratings by hospital
      const hospitalRatings = new Map<string, { total: number; sum: number; count: number }>()
      for (const s of validRatings) {
        const hospital = (s as any).hospital || (s as any)['hospital-on']?.selection || 'Unknown Hospital'
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
      const key = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString().slice(0,10)
      byDate.set(key, (byDate.get(key) || 0) + 1)
    }
    return Array.from(byDate.entries()).sort((a,b)=>a[0].localeCompare(b[0])).map(([date, count]) => ({ date, count }))
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
    
    for (const s of filtered) {
      const pain = (s as any).painScore || (s as any).painLevel
      if (pain !== undefined) {
        painScores.set(Number(pain), (painScores.get(Number(pain)) || 0) + 1)
      }
      
      const wait = (s as any).waitTime
      if (wait) {
        let category = '< 30min'
        if (typeof wait === 'object') {
          const totalMinutes = (wait.hours || 0) * 60 + (wait.minutes || 0)
          if (totalMinutes < 30) category = '< 30min'
          else if (totalMinutes <= 60) category = '30-60min'
          else if (totalMinutes <= 120) category = '1-2hr'
          else if (totalMinutes <= 240) category = '2-4hr'
          else if (totalMinutes <= 480) category = '4-8hr'
          else category = '> 8hr'
        }
        waitTimes.set(category, (waitTimes.get(category) || 0) + 1)
      }
      
      const stay = (s as any).lengthOfStay
      if (stay) {
        let category = '< 1 day'
        if (typeof stay === 'object') {
          const totalDays = (stay.days || 0) + (stay.hours || 0) / 24
          if (totalDays < 1) category = '< 1 day'
          else if (totalDays <= 2) category = '1-2 days'
          else if (totalDays <= 5) category = '3-5 days'
          else if (totalDays <= 7) category = '1 week'
          else category = '> 1 week'
        }
        stayLength.set(category, (stayLength.get(category) || 0) + 1)
      }
      
      const dept = (s as any).department || 'Unknown'
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
        const s = sub as any
        return [
          new Date(sub.submittedAt).toISOString().split('T')[0],
          `${s.firstName || ''} ${s.lastName || ''}`.trim(),
          s.email || '',
          s.phone || '',
          s.city?.selection || '',
          s.province?.selection || '',
          s.primaryHospital?.selection || '',
          Array.isArray(s.scdConnection) ? s.scdConnection.join('; ') : s.scdConnection || '',
          s.mayContact || '',
          s.joinMailingList || '',
          s.joinSupportGroups || ''
        ]
      } else {
        const s = sub as any
        return [
          new Date(sub.submittedAt).toISOString().split('T')[0],
          sub.rating || '',
          s.hospital || s['hospital-on']?.selection || '',
          s.department || '',
          sub.hospitalInteraction || '',
          s.painScore || s.painLevel || '',
          s.waitTime ? (typeof s.waitTime === 'object' ? `${s.waitTime.hours || 0}h ${s.waitTime.minutes || 0}m` : s.waitTime) : '',
          s.lengthOfStay ? (typeof s.lengthOfStay === 'object' ? `${s.lengthOfStay.days || 0}d ${s.lengthOfStay.hours || 0}h` : s.lengthOfStay) : ''
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
        const s = sub as any
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

  const trend = useMemo(() => calculateTrend(metrics, previousPeriodSubmissions), [calculateTrend, metrics, previousPeriodSubmissions])

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
                  Survey: {selectedSurvey}
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
                <UCard className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20 backdrop-blur-sm border-emerald-200/50 dark:border-emerald-800/50" role="article" aria-labelledby="recent-title">
                  <CardHeader className="pb-2">
                    <CardTitle id="recent-title" className="text-base flex items-center gap-2 text-emerald-900 dark:text-emerald-100">
                      <Clock className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" /> 
                      Last 7 Days
                    </CardTitle>
                    <CardDescription>Recent submissions</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="text-3xl font-bold text-emerald-700 dark:text-emerald-300" aria-live="polite">
                      {(metrics as any).last7Days || 0}
                    </div>
                  </CardContent>
                </UCard>
              ) : isConsent ? (
                <UCard className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20 backdrop-blur-sm border-emerald-200/50 dark:border-emerald-800/50" role="article" aria-labelledby="contact-title">
                  <CardHeader className="pb-2">
                    <CardTitle id="contact-title" className="text-base flex items-center gap-2 text-emerald-900 dark:text-emerald-100">
                      <Users className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" /> 
                      May Contact
                    </CardTitle>
                    <CardDescription>Opted in for contact</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="text-3xl font-bold text-emerald-700 dark:text-emerald-300" aria-live="polite">
                      {(metrics as any).consentMetrics?.mayContactPercent || 0}%
                    </div>
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
                      {trend && trend.direction !== 'neutral' && dateRange !== 'all' && (
                        <div className={`flex items-center gap-1 text-xs font-medium ${
                          trend.direction === 'up' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                        }`}>
                          {trend.direction === 'up' ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                          {Math.abs(Number(trend.change))}%
                        </div>
                      )}
                    </div>
                  </CardContent>
                </UCard>
              )}

              {/* Card 3: Different based on survey type */}
              {isAllSurveysMode ? (
                <UCard className="bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/30 dark:to-purple-900/20 backdrop-blur-sm border-purple-200/50 dark:border-purple-800/50" role="article" aria-labelledby="location-overview-title">
                  <CardHeader className="pb-2">
                    <CardTitle id="location-overview-title" className="text-base flex items-center gap-2 text-purple-900 dark:text-purple-100">
                      <Building2 className="h-4 w-4 text-purple-600 dark:text-purple-400" aria-hidden="true" /> 
                      Top Location
                    </CardTitle>
                    <CardDescription>Most common location</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="text-lg font-bold truncate text-purple-700 dark:text-purple-300" aria-live="polite">
                      {(metrics as any).overviewMetrics?.topLocation || 'N/A'}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {(metrics as any).overviewMetrics?.geographicDistribution?.[0]?.count || 0} submissions
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
                <UCard className="bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/30 dark:to-purple-900/20 backdrop-blur-sm border-purple-200/50 dark:border-purple-800/50" role="article" aria-labelledby="hospital-title">
                  <CardHeader className="pb-2">
                    <CardTitle id="hospital-title" className="text-base flex items-center gap-2 text-purple-900 dark:text-purple-100">
                      <Gauge className="h-4 w-4 text-purple-600 dark:text-purple-400" aria-hidden="true" /> 
                      Top Hospital
                    </CardTitle>
                    <CardDescription>By avg rating</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="text-lg font-bold truncate text-purple-700 dark:text-purple-300" aria-live="polite">
                      {(metrics as any).hospitalRatings?.[0]?.name || 'N/A'}
                    </div>
                    <div className="text-sm text-muted-foreground">{(metrics as any).hospitalRatings?.[0]?.avgRating || '0'}/10</div>
                  </CardContent>
                </UCard>
              )}

              {/* Card 4: Different for overview */}
              {isAllSurveysMode ? (
                <UCard className="bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/20 backdrop-blur-sm border-amber-200/50 dark:border-amber-800/50" role="article" aria-labelledby="month-title">
                  <CardHeader className="pb-2">
                    <CardTitle id="month-title" className="text-base flex items-center gap-2 text-amber-900 dark:text-amber-100">
                      <Calendar className="h-4 w-4 text-amber-600 dark:text-amber-400" aria-hidden="true" /> 
                      Last 30 Days
                    </CardTitle>
                    <CardDescription>Monthly submissions</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="text-3xl font-bold text-amber-700 dark:text-amber-300" aria-live="polite">{(metrics as any).last30Days || 0}</div>
                  </CardContent>
                </UCard>
              ) : (
                <UCard className="bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/20 backdrop-blur-sm border-amber-200/50 dark:border-amber-800/50" role="article" aria-labelledby="surveys-title">
                  <CardHeader className="pb-2">
                    <CardTitle id="surveys-title" className="text-base flex items-center gap-2 text-amber-900 dark:text-amber-100">
                      <BarChart3 className="h-4 w-4 text-amber-600 dark:text-amber-400" aria-hidden="true" /> 
                      Surveys
                    </CardTitle>
                    <CardDescription>Unique surveys</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="text-3xl font-bold text-amber-700 dark:text-amber-300" aria-live="polite">{selectedSurvey === 'all' ? metrics.surveysCount : 1}</div>
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
                        <div className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${
                          submission.rating >= 8 ? 'bg-green-500' :
                          submission.rating >= 5 ? 'bg-yellow-500' : 'bg-red-500'
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
                            ? `${(submission as any)?.city?.selection || 'Unknown City'}`
                            : `${(submission as any)?.hospital || 'Unknown'}`}
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
                        new Date(s.submittedAt).toISOString(),
                        (s as any)?.hospital || 'Unknown',
                        s.rating,
                        s.hospitalInteraction.replace(/,/g, ';'),
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
                  <LineChart data={submissionsOverTime} margin={{ top: 10, right: 30, left: 0, bottom: 40 }}>
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
                    <Line 
                      type="monotone" 
                      dataKey="count" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2} 
                      dot={{ r: 3, fill: 'hsl(var(--primary))' }} 
                      name="Submissions"
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}

              {isAllSurveysMode && selectedChart === 'surveyBreakdown' && (
                (chartData as any).surveyBreakdown?.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={(chartData as any).surveyBreakdown} margin={{ top: 10, right: 30, left: 0, bottom: 100 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                      <XAxis 
                        dataKey="surveyTitle" 
                        tick={{ fontSize: 11 }}
                        angle={-45} 
                        textAnchor="end" 
                        height={120}
                      />
                      <YAxis tick={{ fontSize: 12 }} label={{ value: 'Submissions', angle: -90, position: 'insideLeft' }} />
                      <Tooltip />
                      <Bar dataKey="count" name="Submissions">
                        {(chartData as any).surveyBreakdown.map((_: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#ec4899"][index % 6]} />
                        ))}
                      </Bar>
                    </BarChart>
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
                  <LineChart data={submissionsOverTime} margin={{ top: 10, right: 30, left: 0, bottom: 40 }}>
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
                    <Line 
                      type="monotone" 
                      dataKey="count" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2} 
                      dot={{ r: 3, fill: 'hsl(var(--primary))' }} 
                      name="Submissions"
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
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
                  <LineChart data={ratingOverTime} margin={{ top: 10, right: 30, left: 0, bottom: 40 }}>
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
                    <Line 
                      type="monotone" 
                      dataKey="avg" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2} 
                      dot={{ r: 4, fill: 'hsl(var(--primary))' }} 
                      name="Avg Rating"
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
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
                        labelLine={false}
                        label={({ category, count, percent }) => `${category}: ${count} (${(percent * 100).toFixed(0)}%)`}
                        outerRadius={100}
                        fill="#8884d8"
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
                        labelLine={false}
                        label={({ category, count, percent }) => `${category}: ${count} (${(percent * 100).toFixed(0)}%)`}
                        outerRadius={100}
                        fill="#8884d8"
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
            <CardTitle>Feedback Analysis</CardTitle>
            <CardDescription>
              Generate comprehensive insights from all feedback submissions
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
                  'Generate Analysis'
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
        <Card id="submissions-table-section">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Submissions</CardTitle>
                <CardDescription>
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
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Date</TableHead>
                    <TableHead className="whitespace-nowrap">Survey</TableHead>
                    {isConsent ? (
                      <>
                        <TableHead className="whitespace-nowrap">Name</TableHead>
                        <TableHead className="whitespace-nowrap">Email</TableHead>
                        <TableHead className="whitespace-nowrap">City</TableHead>
                      </>
                    ) : (
                      <>
                        <TableHead className="whitespace-nowrap">Rating</TableHead>
                        <TableHead className="whitespace-nowrap">Hospital</TableHead>
                        <TableHead className="whitespace-nowrap">Experience</TableHead>
                      </>
                    )}
                    <TableHead className="text-right whitespace-nowrap">Actions</TableHead>
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
                    <TableRow key={submission.id}>
                      <TableCell className="whitespace-nowrap">
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
                      <TableCell>
                        <Badge variant="outline" className="font-normal">
                          {surveyTitleMap.get(submission.surveyId) || (submission.surveyId ? submission.surveyId.substring(0, 8) + '...' : 'Unknown Survey')}
                        </Badge>
                      </TableCell>
                      {isConsent ? (
                        <>
                          <TableCell>
                            {`${(submission as any)?.firstName || ''} ${(submission as any)?.lastName || ''}`.trim() || 'N/A'}
                          </TableCell>
                          <TableCell>{(submission as any)?.email || 'N/A'}</TableCell>
                          <TableCell>{(submission as any)?.city?.selection || 'N/A'}</TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {(() => {
                                const rating = Number(submission.rating)
                                const isValidRating = !isNaN(rating) && rating >= 0 && rating <= 10
                                return (
                                  <>
                                    <div className={`h-2 w-2 rounded-full ${
                                      isValidRating && rating >= 8 ? 'bg-green-500' :
                                      isValidRating && rating >= 5 ? 'bg-yellow-500' : 'bg-red-500'
                                    }`} />
                                    <span>{isValidRating ? `${rating}/10` : 'N/A'}</span>
                                  </>
                                )
                              })()}
                            </div>
                          </TableCell>
                          <TableCell>{(submission as any)?.hospital || (submission as any)?.['hospital-on']?.selection || 'N/A'}</TableCell>
                          <TableCell className="max-w-xs truncate">{submission.hospitalInteraction || 'N/A'}</TableCell>
                        </>
                      )}
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => openSubmissionModal(submission)}>View Details</Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            </div>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="w-[95vw] max-w-5xl max-h-[90vh] overflow-hidden flex flex-col bg-gradient-to-br from-white/70 via-white/60 to-blue-50/50 dark:from-gray-900/70 dark:via-gray-900/60 dark:to-indigo-950/50 backdrop-blur-2xl backdrop-saturate-150 border border-white/30 dark:border-white/20 shadow-2xl ring-1 ring-white/20">
            <DialogHeader className="flex-shrink-0 border-b border-white/20 pb-4 bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 backdrop-blur-md rounded-t-lg">
              <div className="flex items-start justify-between">
                <div>
                  <DialogTitle className="text-xl font-semibold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                    {isConsent 
                      ? `${(activeSubmission as any)?.firstName || ''} ${(activeSubmission as any)?.lastName || ''}`.trim() || 'Anonymous'
                      : (activeSubmission as any)?.name || (activeSubmission as any)?.firstName || 'Anonymous'
                    } - {isConsent ? 'Consent Submission' : 'Feedback Submission'}
                  </DialogTitle>
                  <DialogDescription className="mt-2 flex items-center gap-4 text-gray-600 dark:text-gray-400">
                    <span className="flex items-center gap-1 bg-white/50 dark:bg-gray-800/50 px-2 py-1 rounded-full text-xs">
                      <Calendar className="h-3 w-3" />
                      {activeSubmission && new Date(activeSubmission.submittedAt).toISOString().replace('T', ' ').split('.')[0]}
                    </span>
                    <span className="flex items-center gap-1 bg-white/50 dark:bg-gray-800/50 px-2 py-1 rounded-full text-xs">
                      <Building2 className="h-3 w-3" />
                      {isConsent
                        ? (activeSubmission as any)?.primaryHospital?.selection || (activeSubmission as any)?.city?.selection || 'Unknown Location'
                        : (activeSubmission as any)?.hospital || (activeSubmission as any)?.['hospital-on']?.selection || 'Unknown Hospital'
                      }
                    </span>
                  </DialogDescription>
                </div>
                {!isConsent && (
                  <div className={`px-4 py-2 rounded-full text-sm font-medium backdrop-blur-sm shadow-lg ${
                    activeSubmission && activeSubmission.rating >= 8 ? 'bg-green-500/20 text-green-700 dark:text-green-300 border border-green-500/30' :
                    activeSubmission && activeSubmission.rating >= 5 ? 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border border-yellow-500/30' : 
                    'bg-red-500/20 text-red-700 dark:text-red-300 border border-red-500/30'
                  }`}>
                    {activeSubmission && activeSubmission.rating >= 8 ? '✨ Excellent' :
                     activeSubmission && activeSubmission.rating >= 5 ? '👍 Good' : '⚠️ Needs Improvement'}
                  </div>
                )}
              </div>
            </DialogHeader>
            {activeSubmission && (
              <div className="flex-1 overflow-y-auto space-y-6 pr-2 bg-gradient-to-b from-transparent via-white/10 to-blue-500/5 dark:from-transparent dark:via-gray-900/10 dark:to-indigo-500/5 rounded-lg">
                {/* Quick Stats Section */}
                <Card className="border border-white/30 shadow-xl bg-gradient-to-br from-white/50 to-white/30 dark:from-gray-800/50 dark:to-gray-900/30 backdrop-blur-lg backdrop-saturate-150">
                  <CardHeader className="pb-3 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-t-lg backdrop-blur-sm">
                    <CardTitle className="text-base flex items-center gap-2 text-gray-800 dark:text-gray-200">
                      <div className="p-1.5 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg shadow-md">
                        <BarChart3 className="h-4 w-4 text-white" />
                      </div>
                      Quick Insights
                    </CardTitle>
                    <div className="flex gap-2 mt-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (!activeSubmission) return
                          const csv = [
                            ['Field', 'Value'],
                            ['Date', new Date(activeSubmission.submittedAt).toISOString()],
                            ['Hospital', (activeSubmission as any)?.hospital || 'Unknown'],
                            ['Rating', activeSubmission.rating],
                            ['Experience', activeSubmission.hospitalInteraction],
                            ...Object.entries(activeSubmission)
                              .filter(([key]) => !['id', 'submittedAt', 'surveyId', 'rating', 'hospitalInteraction'].includes(key))
                              .map(([key, value]) => [
                                key, 
                                Array.isArray(value) 
                                  ? value.join('; ') 
                                  : typeof value === 'object' 
                                    ? JSON.stringify(value) 
                                    : String(value)
                              ])
                          ].map(row => row.join(',')).join('\n')
                          
                          const blob = new Blob([csv], { type: 'text/csv' })
                          const url = URL.createObjectURL(blob)
                          const a = document.createElement('a')
                          a.href = url
                          a.download = `submission-${activeSubmission.id}.csv`
                          a.click()
                        }}
                        title="Export submission as CSV"
                      >
                        <FileSpreadsheet className="h-4 w-4 mr-1" />
                        CSV
                      </Button>
                      {singleAnalysis && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={async () => {
                            const res = await generateAnalysisPdf({ 
                              title: 'Individual Submission Report', 
                              surveyId: String(activeSubmission?.surveyId), 
                              analysisMarkdown: singleAnalysis || '' 
                            })
                            if (res.error || !res.pdfBase64) return
                            const link = document.createElement('a')
                            link.href = `data:application/pdf;base64,${res.pdfBase64}`
                            link.download = `submission-${activeSubmission?.id}.pdf`
                            link.click()
                          }}
                          title="Download analysis as PDF"
                        >
                          <FileText className="h-4 w-4 mr-1" />
                          PDF
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {/* Visit Reason/Chief Complaint */}
                      {((activeSubmission as any)?.visitReason || (activeSubmission as any)?.chiefComplaint || (activeSubmission as any)?.reasonForVisit) && (
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-gradient-to-br from-purple-500/20 to-purple-600/20 backdrop-blur-sm rounded-lg shadow-md border border-purple-500/20">
                            <AlertCircle className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                          </div>
                  <div>
                            <p className="text-xs text-gray-600 dark:text-gray-400">Visit Reason</p>
                            <p className="text-sm font-bold text-gray-800 dark:text-gray-200">
                              {(activeSubmission as any)?.visitReason || 
                               (activeSubmission as any)?.chiefComplaint || 
                               (activeSubmission as any)?.reasonForVisit}
                            </p>
                          </div>
                        </div>
                      )}
                      
                      {/* Time to Analgesia (for pain-related visits) */}
                      {(activeSubmission as any)?.timeToAnalgesia && (
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-gradient-to-br from-white/40 to-white/20 dark:from-gray-800/40 dark:to-gray-800/20 backdrop-blur-sm rounded-lg shadow-md border border-white/20">
                            <Heart className="h-5 w-5 text-pink-500" />
                  </div>
                  <div>
                            <p className="text-xs text-muted-foreground">Time to Pain Relief</p>
                            <p className="text-lg font-bold">
                              {typeof (activeSubmission as any).timeToAnalgesia === 'object' 
                                ? `${(activeSubmission as any).timeToAnalgesia.hours || 0}h ${(activeSubmission as any).timeToAnalgesia.minutes || 0}m`
                                : (activeSubmission as any).timeToAnalgesia}
                            </p>
                  </div>
                        </div>
                      )}
                      
                      {/* Pain Score if available */}
                      {((activeSubmission as any)?.painScore !== undefined || (activeSubmission as any)?.painLevel !== undefined) && (
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-gradient-to-br from-white/40 to-white/20 dark:from-gray-800/40 dark:to-gray-800/20 backdrop-blur-sm rounded-lg shadow-md border border-white/20">
                            <Activity className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                            <p className="text-xs text-muted-foreground">Pain Level</p>
                            <p className="text-lg font-bold">
                              {(activeSubmission as any)?.painScore || (activeSubmission as any)?.painLevel}/10
                            </p>
                </div>
                        </div>
                      )}
                      
                      {/* Wait Time */}
                      {(activeSubmission as any)?.waitTime && (
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-gradient-to-br from-white/40 to-white/20 dark:from-gray-800/40 dark:to-gray-800/20 backdrop-blur-sm rounded-lg shadow-md border border-white/20">
                            <Clock className="h-5 w-5 text-blue-500" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Wait Time</p>
                            <p className="text-lg font-bold">
                              {typeof (activeSubmission as any).waitTime === 'object' 
                                ? `${(activeSubmission as any).waitTime.hours || 0}h ${(activeSubmission as any).waitTime.minutes || 0}m`
                                : (activeSubmission as any).waitTime}
                            </p>
                          </div>
                        </div>
                      )}
                      
                      {/* Length of Stay */}
                      {(activeSubmission as any)?.lengthOfStay && (
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-gradient-to-br from-white/40 to-white/20 dark:from-gray-800/40 dark:to-gray-800/20 backdrop-blur-sm rounded-lg shadow-md border border-white/20">
                            <Activity className="h-5 w-5 text-green-500" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Length of Stay</p>
                            <p className="text-lg font-bold">
                              {typeof (activeSubmission as any).lengthOfStay === 'object'
                                ? `${(activeSubmission as any).lengthOfStay.days || 0}d ${(activeSubmission as any).lengthOfStay.hours || 0}h`
                                : (activeSubmission as any).lengthOfStay}
                            </p>
                          </div>
                        </div>
                      )}
                      
                      {/* Department/Service */}
                      {(activeSubmission as any)?.department && (
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-gradient-to-br from-white/40 to-white/20 dark:from-gray-800/40 dark:to-gray-800/20 backdrop-blur-sm rounded-lg shadow-md border border-white/20">
                            <Heart className="h-5 w-5 text-red-500" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Department</p>
                            <p className="text-sm font-bold truncate max-w-[100px]">
                              {(activeSubmission as any).department}
                            </p>
                          </div>
                        </div>
                      )}
                      
                      {/* Visit Type */}
                      {(activeSubmission as any)?.visitType && (
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-gradient-to-br from-white/40 to-white/20 dark:from-gray-800/40 dark:to-gray-800/20 backdrop-blur-sm rounded-lg shadow-md border border-white/20">
                            <AlertCircle className="h-5 w-5 text-purple-500" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Visit Type{Array.isArray((activeSubmission as any).visitType) && (activeSubmission as any).visitType.length > 1 ? 's' : ''}</p>
                            <p className="text-sm font-bold">
                              {Array.isArray((activeSubmission as any).visitType) 
                                ? (activeSubmission as any).visitType.map((type: string) => 
                                    type.charAt(0).toUpperCase() + type.slice(1)
                                  ).join(', ')
                                : (activeSubmission as any).visitType}
                            </p>
                          </div>
                        </div>
                      )}
                      
                      {/* Staff Rating if available */}
                      {(activeSubmission as any)?.staffRating && (
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-gradient-to-br from-white/40 to-white/20 dark:from-gray-800/40 dark:to-gray-800/20 backdrop-blur-sm rounded-lg shadow-md border border-white/20">
                            <Users className="h-5 w-5 text-indigo-500" />
                          </div>
                  <div>
                            <p className="text-xs text-muted-foreground">Staff Rating</p>
                            <p className="text-lg font-bold">{(activeSubmission as any).staffRating}/10</p>
                          </div>
                        </div>
                      )}
                      
                      {/* Cleanliness Rating if available */}
                      {(activeSubmission as any)?.cleanlinessRating && (
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-gradient-to-br from-white/40 to-white/20 dark:from-gray-800/40 dark:to-gray-800/20 backdrop-blur-sm rounded-lg shadow-md border border-white/20">
                            <Sparkles className="h-5 w-5 text-cyan-500" />
                  </div>
                  <div>
                            <p className="text-xs text-muted-foreground">Cleanliness</p>
                            <p className="text-lg font-bold">{(activeSubmission as any).cleanlinessRating}/10</p>
                  </div>
                        </div>
                      )}
                      
                      {/* Recommendation Score */}
                      {(activeSubmission as any)?.wouldRecommend !== undefined && (
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-gradient-to-br from-white/40 to-white/20 dark:from-gray-800/40 dark:to-gray-800/20 backdrop-blur-sm rounded-lg shadow-md border border-white/20">
                            <ThumbsUp className="h-5 w-5 text-emerald-500" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Would Recommend</p>
                            <p className="text-sm font-bold">
                              {(activeSubmission as any).wouldRecommend ? 'Yes' : 'No'}
                            </p>
                          </div>
                        </div>
                      )}
                      
                      {/* Time to See Doctor */}
                      {(activeSubmission as any)?.timeToSeeDoctor && (
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-gradient-to-br from-white/40 to-white/20 dark:from-gray-800/40 dark:to-gray-800/20 backdrop-blur-sm rounded-lg shadow-md border border-white/20">
                            <Users className="h-5 w-5 text-indigo-500" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Time to Doctor</p>
                            <p className="text-lg font-bold">
                              {typeof (activeSubmission as any).timeToSeeDoctor === 'object' 
                                ? `${(activeSubmission as any).timeToSeeDoctor.hours || 0}h ${(activeSubmission as any).timeToSeeDoctor.minutes || 0}m`
                                : (activeSubmission as any).timeToSeeDoctor}
                            </p>
                          </div>
                        </div>
                      )}
                      
                      {/* Triage Category if available */}
                      {(activeSubmission as any)?.triageCategory && (
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-gradient-to-br from-white/40 to-white/20 dark:from-gray-800/40 dark:to-gray-800/20 backdrop-blur-sm rounded-lg shadow-md border border-white/20">
                            <AlertCircle className="h-5 w-5 text-red-500" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Triage Level</p>
                            <p className="text-sm font-bold">
                              {(activeSubmission as any).triageCategory}
                            </p>
                          </div>
                        </div>
                      )}
                      
                      {/* Overall Hospital Rating - Show only if no other metrics available */}
                      {!((activeSubmission as any)?.waitTime || 
                         (activeSubmission as any)?.lengthOfStay || 
                         (activeSubmission as any)?.timeToAnalgesia ||
                         (activeSubmission as any)?.painScore ||
                         (activeSubmission as any)?.painLevel ||
                         (activeSubmission as any)?.timeToSeeDoctor) && (
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-gradient-to-br from-white/40 to-white/20 dark:from-gray-800/40 dark:to-gray-800/20 backdrop-blur-sm rounded-lg shadow-md border border-white/20">
                            <Star className="h-5 w-5 text-yellow-500" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Overall Rating</p>
                            <p className="text-lg font-bold">{activeSubmission.rating}/10</p>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Experience Summary Bar - Only for feedback surveys */}
                    {!isConsent && (
                      <div className="mt-4 pt-4 border-t">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Overall Experience</span>
                          <span className="text-sm text-muted-foreground">{activeSubmission.rating}/10</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                          <div 
                            className={`h-2.5 rounded-full transition-all ${
                              activeSubmission.rating >= 8 ? 'bg-green-500' :
                              activeSubmission.rating >= 5 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${(activeSubmission.rating / 10) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
                {/* AI Analysis Section - Top Priority */}
                {singleAnalysis && (
                  <Card className="border border-white/30 shadow-xl bg-gradient-to-br from-indigo-500/20 via-purple-500/15 to-pink-500/10 backdrop-blur-lg backdrop-saturate-150">
                    <CardHeader className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-t-lg backdrop-blur-sm">
                      <CardTitle className="text-lg flex items-center gap-2 text-gray-800 dark:text-gray-200">
                        <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg shadow-md">
                          <TrendingUp className="h-5 w-5 text-white" />
                        </div>
                        AI Analysis Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="bg-gradient-to-b from-white/30 to-white/20 dark:from-gray-800/30 dark:to-gray-900/20 backdrop-blur-sm">
                      <div className="prose prose-sm max-w-none dark:prose-invert">
                        <ReactMarkdown>{singleAnalysis}</ReactMarkdown>
                      </div>
                    </CardContent>
                  </Card>
                )}
                
                {/* Analysis Actions - Only show for feedback surveys */}
                {!isConsent && (
                  <div className="flex flex-wrap gap-2 p-4 bg-gradient-to-r from-white/30 via-blue-50/20 to-indigo-50/20 dark:from-gray-800/30 dark:via-blue-950/20 dark:to-indigo-950/20 backdrop-blur-md rounded-lg border border-white/30 shadow-lg">
                    <Button
                      onClick={async () => {
                        if (!activeSubmission) return
                        setSingleLoading(true)
                        const { analyzeSingleFeedback } = await import('./actions')
                        const res = await analyzeSingleFeedback({ 
                          rating: activeSubmission.rating, 
                        hospitalInteraction: activeSubmission.hospitalInteraction,
                        location: (activeSubmission as any).hospital || 'Various Hospitals'
                      })
                      if (!res.error) setSingleAnalysis(res.summary || null)
                      setSingleLoading(false)
                    }}
                    disabled={singleLoading}
                    className={singleAnalysis 
                      ? "bg-white/50 hover:bg-white/70 dark:bg-gray-800/50 dark:hover:bg-gray-800/70 text-gray-800 dark:text-gray-200 border border-white/20 shadow-md" 
                      : "bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white shadow-lg"}
                  >
                    {singleLoading ? (
                      <>
                        <Loader className="mr-2 h-4 w-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : singleAnalysis ? (
                      'Re-analyze Response'
                    ) : (
                      'Generate AI Analysis'
                    )}
                  </Button>
                  {singleAnalysis && (
                    <Button
                      className="bg-white/50 hover:bg-white/70 dark:bg-gray-800/50 dark:hover:bg-gray-800/70 text-gray-800 dark:text-gray-200 border border-white/20 shadow-md"
                      onClick={async () => {
                        const { generateAnalysisPdf } = await import('./actions')
                        const res = await generateAnalysisPdf({ 
                          title: 'Individual Feedback Analysis', 
                          surveyId: String(activeSubmission.surveyId), 
                          analysisMarkdown: singleAnalysis || '' 
                        })
                        if (res.error || !res.pdfBase64) return
                        const link = document.createElement('a')
                        link.href = `data:application/pdf;base64,${res.pdfBase64}`
                        link.download = `analysis-${activeSubmission.id}.pdf`
                        link.click()
                      }}
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      Download Report PDF
                    </Button>
                  )}
                  </div>
                )}

                {/* Organized Submission Data Table */}
                <Card className="border border-white/30 shadow-xl bg-gradient-to-br from-white/50 to-gray-50/30 dark:from-gray-800/50 dark:to-gray-900/30 backdrop-blur-lg backdrop-saturate-150">
                  <CardHeader className="bg-gradient-to-r from-gray-500/10 to-blue-500/10 rounded-t-lg backdrop-blur-sm">
                    <CardTitle className="text-lg text-gray-800 dark:text-gray-200">Submission Data</CardTitle>
                    <CardDescription className="text-gray-600 dark:text-gray-400">Structured view of all response fields</CardDescription>
                  </CardHeader>
                  <CardContent className="bg-gradient-to-b from-white/30 to-white/20 dark:from-gray-800/30 dark:to-gray-900/20 backdrop-blur-sm">
                    <Table>
                      <TableBody>
                        <TableRow>
                          <TableCell className="font-medium w-1/3">Submission ID</TableCell>
                          <TableCell className="font-mono text-sm">{activeSubmission.id}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">Date & Time</TableCell>
                          <TableCell>{new Date(activeSubmission.submittedAt).toISOString().replace('T', ' ').split('.')[0]}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">Survey ID</TableCell>
                          <TableCell>{activeSubmission.surveyId}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">Overall Rating</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="text-lg font-semibold">{activeSubmission.rating}/10</span>
                              <div className="flex gap-0.5">
                                {[...Array(10)].map((_, i) => (
                                  <Star 
                                    key={i} 
                                    className={`h-4 w-4 ${i < activeSubmission.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} 
                                  />
                                ))}
                  </div>
                            </div>
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium align-top">Hospital Experience</TableCell>
                          <TableCell>
                            <div className="whitespace-pre-wrap break-words max-w-md">
                              {activeSubmission.hospitalInteraction || 'No description provided'}
                  </div>
                          </TableCell>
                        </TableRow>
                        {/* Dynamic fields from submission */}
                        {Object.entries(activeSubmission).map(([key, value]) => {
                          // Skip already displayed fields
                          if (['id', 'submittedAt', 'surveyId', 'rating', 'hospitalInteraction'].includes(key)) {
                            return null
                          }
                          // Format field name
                          const fieldName = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())
                          return (
                            <TableRow key={key}>
                              <TableCell className="font-medium">{fieldName}</TableCell>
                              <TableCell>
                                {typeof value === 'object' && value !== null ? (
                                  <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                                    {JSON.stringify(value, null, 2)}
                                  </pre>
                                ) : (
                                  String(value)
                                )}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* Raw Data Collapsible - Optional for debugging */}
                <details className="rounded-lg border border-white/30 bg-gradient-to-br from-white/40 to-gray-50/30 dark:from-gray-800/40 dark:to-gray-900/30 backdrop-blur-md backdrop-saturate-150 p-4 shadow-lg">
                  <summary className="cursor-pointer text-sm text-gray-600 dark:text-gray-400 font-medium hover:text-gray-800 dark:hover:text-gray-200 transition-colors">
                    ▶ View Raw JSON Data
                  </summary>
                  <pre className="mt-3 max-h-64 overflow-auto rounded-lg bg-gradient-to-br from-black/5 to-blue-900/5 dark:from-black/20 dark:to-indigo-900/20 backdrop-blur-sm p-4 text-xs font-mono text-gray-700 dark:text-gray-300 border border-white/20">
                    {JSON.stringify(activeSubmission, null, 2)}
                  </pre>
                </details>
              </div>
            )}
            <DialogFooter className="flex-shrink-0 border-t border-white/20 pt-4 bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 backdrop-blur-md rounded-b-lg">
              <Button 
                className="bg-red-500 hover:bg-red-600 text-white shadow-lg hover:shadow-xl transition-all duration-200" 
                onClick={closeSubmissionModal}
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
            <Pagination className="mt-4">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => handlePageChange(currentPage - 1)}
                  />
                </PaginationItem>
                {[...Array(totalPages)].map((_, i) => (
                  <PaginationItem key={i}>
                    <PaginationLink
                      onClick={() => handlePageChange(i + 1)}
                      isActive={currentPage === i + 1}
                    >
                      {i + 1}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <PaginationNext
                    onClick={() => handlePageChange(currentPage + 1)}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </CardContent>
        </Card>
        </div>
      </div>

      {/* Floating AI Chat Button */}
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
