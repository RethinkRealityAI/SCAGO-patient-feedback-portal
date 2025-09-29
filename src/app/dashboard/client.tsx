'use client'

import { useMemo, useState } from 'react'
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
  Activity, Heart, Users, Sparkles, ThumbsUp, Download, FileText, FileSpreadsheet
} from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
import { useNotifications, useAnalyticsNotifications } from '@/hooks/use-notifications'
import { NotificationSystem } from '@/components/notification-system'
import FloatingChatButton from '@/components/floating-chat-button'
import AnalysisDisplay from '@/components/analysis-display'

const SUBMISSIONS_PER_PAGE = 10

export default function Dashboard({
  submissions,
}: {
  submissions: FeedbackSubmission[]
}) {
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
  const [selectedChart, setSelectedChart] = useState<'rating' | 'pain' | 'wait' | 'stay' | 'satisfaction'>('rating')
  const [searchQuery, setSearchQuery] = useState('')
  const [dateRange, setDateRange] = useState<'all' | '7d' | '30d' | '90d'>('all')
  const [ratingFilter, setRatingFilter] = useState<'all' | 'excellent' | 'good' | 'poor'>('all')
  const [hospitalFilter, setHospitalFilter] = useState('all')
  const [isRefreshing, setIsRefreshing] = useState(false)

  const surveyOptions = useMemo(() => {
    const ids = Array.from(new Set(submissions.map(s => s.surveyId)))
    return ['all', ...ids]
  }, [submissions])

  const hospitalOptions = useMemo(() => {
    const hospitals = Array.from(new Set(submissions.map(s => 
      (s as any).hospital || (s as any)['hospital-on']?.selection || 'Unknown Hospital'
    )))
    return ['all', ...hospitals]
  }, [submissions])

  const filtered = useMemo(() => {
    let result = submissions

    // Filter by survey
    if (selectedSurvey !== 'all') {
      result = result.filter(s => s.surveyId === selectedSurvey)
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(s => 
        (s.hospitalInteraction || '').toLowerCase().includes(query) ||
        ((s as any).hospital || '').toLowerCase().includes(query) ||
        (s.surveyId || '').toLowerCase().includes(query)
      )
    }

    // Filter by date range
    if (dateRange !== 'all') {
      const now = new Date()
      const daysAgo = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90
      const cutoff = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000))
      result = result.filter(s => new Date(s.submittedAt) >= cutoff)
    }

    // Filter by rating
    if (ratingFilter !== 'all') {
      if (ratingFilter === 'excellent') {
        result = result.filter(s => s.rating >= 8)
      } else if (ratingFilter === 'good') {
        result = result.filter(s => s.rating >= 5 && s.rating < 8)
      } else if (ratingFilter === 'poor') {
        result = result.filter(s => s.rating < 5)
      }
    }

    // Filter by hospital
    if (hospitalFilter !== 'all') {
      result = result.filter(s => {
        const hospital = (s as any).hospital || (s as any)['hospital-on']?.selection || 'Unknown Hospital'
        return hospital === hospitalFilter
      })
    }

    return result
  }, [submissions, selectedSurvey, searchQuery, dateRange, ratingFilter, hospitalFilter])

  const totalPages = Math.ceil(filtered.length / SUBMISSIONS_PER_PAGE)

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
      const d = new Date(s.submittedAt)
      const key = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString().slice(0,10)
      const current = byDate.get(key) || { date: key, avg: 0, count: 0 }
      const nextCount = current.count + 1
      const nextAvg = (current.avg * current.count + Number(s.rating || 0)) / nextCount
      byDate.set(key, { date: key, avg: nextAvg, count: nextCount })
    }
    return Array.from(byDate.values()).sort((a,b) => a.date.localeCompare(b.date))
  }, [filtered])

  const metrics = useMemo(() => {
    const total = filtered.length
    const validRatings = filtered.filter(s => s.rating != null && !isNaN(Number(s.rating)))
    const avg = validRatings.length > 0 ? (validRatings.reduce((a, s) => a + Number(s.rating), 0) / validRatings.length) : 0
    let excellent = 0, good = 0, needsImprovement = 0
    for (const s of validRatings) {
      const r = Number(s.rating)
      if (r >= 8) excellent++
      else if (r >= 5) good++
      else needsImprovement++
    }
    const surveysCount = new Set(submissions.map(s => s.surveyId)).size
    
    // Group ratings by hospital
    const hospitalRatings = new Map<string, { total: number; sum: number; count: number }>()
    for (const s of validRatings) {
      const hospital = (s as any).hospital || (s as any)['hospital-on'] || 'Unknown Hospital'
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
  }, [filtered, submissions])

  const experienceData = useMemo(() => ([
    { name: 'Excellent (8-10)', value: metrics.excellent },
    { name: 'Good (5-7)', value: metrics.good },
    { name: 'Needs Improvement (0-4)', value: metrics.needsImprovement },
  ]), [metrics])

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
    // Pain scores distribution
    const painScores = new Map<number, number>()
    for (let i = 0; i <= 10; i++) painScores.set(i, 0)
    
    // Wait time distribution
    const waitTimes = new Map<string, number>()
    const waitCategories = ['< 30min', '30-60min', '1-2hr', '2-4hr', '4-8hr', '> 8hr']
    waitCategories.forEach(cat => waitTimes.set(cat, 0))
    
    // Length of stay distribution
    const stayLength = new Map<string, number>()
    const stayCategories = ['< 1 day', '1-2 days', '3-5 days', '1 week', '> 1 week']
    stayCategories.forEach(cat => stayLength.set(cat, 0))
    
    // Satisfaction by department
    const departmentSatisfaction = new Map<string, { total: number; sum: number }>()
    
    for (const s of filtered) {
      // Pain scores
      const pain = (s as any).painScore || (s as any).painLevel
      if (pain !== undefined) {
        painScores.set(Number(pain), (painScores.get(Number(pain)) || 0) + 1)
      }
      
      // Wait times
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
      
      // Length of stay
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
      
      // Department satisfaction
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
        .slice(0, 5)
    }
  }, [filtered])

  const handleAnalyzeFeedback = async () => {
    setIsLoading(true)
    setError(null)
    const result = await analyzeFeedback()
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
    // Simulate refresh - in a real app, this would refetch data
    await new Promise(resolve => setTimeout(resolve, 1000))
    setIsRefreshing(false)
  }

  const clearAllFilters = () => {
    setSearchQuery('')
    setDateRange('all')
    setRatingFilter('all')
    setHospitalFilter('all')
    setSelectedSurvey('all')
    setCurrentPage(1)
  }

  const activeFiltersCount = [
    searchQuery.trim() ? 1 : 0,
    dateRange !== 'all' ? 1 : 0,
    ratingFilter !== 'all' ? 1 : 0,
    hospitalFilter !== 'all' ? 1 : 0,
    selectedSurvey !== 'all' ? 1 : 0
  ].reduce((a, b) => a + b, 0)

  // Notification system
  const { notifications, addNotification, removeNotification, clearAllNotifications } = useNotifications()
  
  // Analytics notifications
  useAnalyticsNotifications(submissions)

  return (
    <>
      <NotificationSystem
        notifications={notifications}
        onRemove={removeNotification}
        onClearAll={clearAllNotifications}
      />
      <div className="container mx-auto px-4 py-8">
        <div className="grid gap-6">
        {/* Header with Enhanced Filters */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Feedback Dashboard</h1>
              <p className="text-muted-foreground">Comprehensive hospital experience analytics</p>
            </div>
            <div className="flex items-center gap-2">
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
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search feedback, hospitals, surveys..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64"
              />
            </div>
            
            <Select onValueChange={setSelectedSurvey} value={selectedSurvey}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by survey" />
              </SelectTrigger>
              <SelectContent>
                {surveyOptions.map(id => (
                  <SelectItem key={id} value={id}>{id === 'all' ? 'All Surveys' : id}</SelectItem>
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

            <Select onValueChange={setHospitalFilter} value={hospitalFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by hospital" />
              </SelectTrigger>
              <SelectContent>
                {hospitalOptions.map(hospital => (
                  <SelectItem key={hospital} value={hospital}>
                    {hospital === 'all' ? 'All Hospitals' : hospital}
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
              <UCard className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20 backdrop-blur-sm border-emerald-200/50 dark:border-emerald-800/50" role="article" aria-labelledby="rating-title">
                <CardHeader className="pb-2">
                  <CardTitle id="rating-title" className="text-base flex items-center gap-2 text-emerald-900 dark:text-emerald-100">
                    <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" /> 
                    Avg Rating
                  </CardTitle>
                  <CardDescription>Across selection</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-3xl font-bold text-emerald-700 dark:text-emerald-300" aria-live="polite">{metrics.avg}/10</div>
                </CardContent>
              </UCard>
              <UCard className="bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/30 dark:to-purple-900/20 backdrop-blur-sm border-purple-200/50 dark:border-purple-800/50" role="article" aria-labelledby="hospital-title">
                <CardHeader className="pb-2">
                  <CardTitle id="hospital-title" className="text-base flex items-center gap-2 text-purple-900 dark:text-purple-100">
                    <Gauge className="h-4 w-4 text-purple-600 dark:text-purple-400" aria-hidden="true" /> 
                    Top Hospital
                  </CardTitle>
                  <CardDescription>By avg rating</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-lg font-bold truncate text-purple-700 dark:text-purple-300" aria-live="polite">{metrics.hospitalRatings[0]?.name || 'N/A'}</div>
                  <div className="text-sm text-muted-foreground">{metrics.hospitalRatings[0]?.avgRating || '0'}/10</div>
                </CardContent>
              </UCard>
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
            </div>

        {/* Advanced Insights Section - Now Always Visible */}
        <div className="grid gap-4">
          {/* Sentiment Distribution */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-green-50 dark:bg-green-950/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Excellent Experience</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {Math.round((metrics.excellent / (metrics.total || 1)) * 100)}%
            </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {metrics.excellent} submissions (8-10 rating)
                </p>
              </CardContent>
            </Card>
            <Card className="bg-yellow-50 dark:bg-yellow-950/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Good Experience</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {Math.round((metrics.good / (metrics.total || 1)) * 100)}%
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {metrics.good} submissions (5-7 rating)
                </p>
              </CardContent>
            </Card>
            <Card className="bg-red-50 dark:bg-red-950/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Needs Improvement</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {Math.round((metrics.needsImprovement / (metrics.total || 1)) * 100)}%
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {metrics.needsImprovement} submissions (0-4 rating)
                </p>
              </CardContent>
            </Card>
            </div>

          {/* Hospital Rankings and Response Trends */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top Hospitals by Rating</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {metrics.hospitalRatings.slice(0, 5).map((hospital, idx) => (
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
                  {metrics.hospitalRatings.length === 0 && (
                    <p className="text-sm text-muted-foreground">No hospital data available</p>
                  )}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent Feedback Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {filtered.slice(0, 5).map((submission, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <div className={`mt-1 h-2 w-2 rounded-full ${
                        submission.rating >= 8 ? 'bg-green-500' :
                        submission.rating >= 5 ? 'bg-yellow-500' : 'bg-red-500'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm line-clamp-1">
                          {submission.hospitalInteraction}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {(submission as any)?.hospital || 'Unknown'} • {isNaN(Number(submission.rating)) ? 'N/A' : `${submission.rating}/10`} • {new Date(submission.submittedAt).toISOString().split('T')[0]}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
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
                    <SelectItem value="rating">Rating Trends</SelectItem>
                    <SelectItem value="pain">Pain Scores</SelectItem>
                    <SelectItem value="wait">Wait Times</SelectItem>
                    <SelectItem value="stay">Length of Stay</SelectItem>
                    <SelectItem value="satisfaction">Department Satisfaction</SelectItem>
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
              {selectedChart === 'rating' && (
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
              
              {selectedChart === 'pain' && (
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
              
              {selectedChart === 'wait' && (
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
              
              {selectedChart === 'stay' && (
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
              
              {selectedChart === 'satisfaction' && (
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
                {selectedChart === 'rating' && 'Shows the average rating trend over time for all submissions.'}
                {selectedChart === 'pain' && 'Distribution of pain scores reported by patients (0 = no pain, 10 = severe pain).'}
                {selectedChart === 'wait' && 'Breakdown of emergency department wait times across different time ranges.'}
                {selectedChart === 'stay' && 'Distribution of patient length of stay in the hospital.'}
                {selectedChart === 'satisfaction' && 'Average satisfaction ratings by hospital department.'}
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
        <Card>
          <CardHeader>
            <CardTitle>Recent Submissions</CardTitle>
            <CardDescription>
              A list of the most recent survey submissions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Experience</TableHead>
                  <TableHead className="text-right">View</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedSubmissions.map(submission => (
                  <TableRow key={submission.id}>
                    <TableCell>
                      {new Date(submission.submittedAt).toISOString().split('T')[0]}
                    </TableCell>
                    <TableCell>{isNaN(Number(submission.rating)) ? 'N/A' : `${submission.rating}/10`}</TableCell>
                    <TableCell>{submission.hospitalInteraction}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => openSubmissionModal(submission)}>View</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col bg-gradient-to-br from-white/70 via-white/60 to-blue-50/50 dark:from-gray-900/70 dark:via-gray-900/60 dark:to-indigo-950/50 backdrop-blur-2xl backdrop-saturate-150 border border-white/30 dark:border-white/20 shadow-2xl ring-1 ring-white/20">
            <DialogHeader className="flex-shrink-0 border-b border-white/20 pb-4 bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 backdrop-blur-md rounded-t-lg">
              <div className="flex items-start justify-between">
                <div>
                  <DialogTitle className="text-xl font-semibold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                    {(activeSubmission as any)?.name || (activeSubmission as any)?.firstName || 'Anonymous'} - Feedback Submission
                  </DialogTitle>
                  <DialogDescription className="mt-2 flex items-center gap-4 text-gray-600 dark:text-gray-400">
                    <span className="flex items-center gap-1 bg-white/50 dark:bg-gray-800/50 px-2 py-1 rounded-full text-xs">
                      <Calendar className="h-3 w-3" />
                      {activeSubmission && new Date(activeSubmission.submittedAt).toISOString().replace('T', ' ').split('.')[0]}
                    </span>
                    <span className="flex items-center gap-1 bg-white/50 dark:bg-gray-800/50 px-2 py-1 rounded-full text-xs">
                      <Building2 className="h-3 w-3" />
                      {(activeSubmission as any)?.hospital || (activeSubmission as any)?.['hospital-on']?.selection || 'Unknown Hospital'}
                    </span>
                  </DialogDescription>
                </div>
                <div className={`px-4 py-2 rounded-full text-sm font-medium backdrop-blur-sm shadow-lg ${
                  activeSubmission && activeSubmission.rating >= 8 ? 'bg-green-500/20 text-green-700 dark:text-green-300 border border-green-500/30' :
                  activeSubmission && activeSubmission.rating >= 5 ? 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border border-yellow-500/30' : 
                  'bg-red-500/20 text-red-700 dark:text-red-300 border border-red-500/30'
                }`}>
                  {activeSubmission && activeSubmission.rating >= 8 ? '✨ Excellent' :
                   activeSubmission && activeSubmission.rating >= 5 ? '👍 Good' : '⚠️ Needs Improvement'}
                </div>
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
                              .map(([key, value]) => [key, typeof value === 'object' ? JSON.stringify(value) : String(value)])
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
                            <p className="text-xs text-muted-foreground">Visit Type</p>
                            <p className="text-sm font-bold">
                              {(activeSubmission as any).visitType}
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
                    
                    {/* Experience Summary Bar */}
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
                
                {/* Analysis Actions */}
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
      />
    </>
  )
}
