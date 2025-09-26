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
import { Loader, AlertCircle } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { Line, LineChart, CartesianGrid, XAxis, YAxis, Bar, BarChart } from 'recharts'
import { Card as UCard } from '@/components/ui/card'
import { ClipboardList, TrendingUp, Gauge, BarChart3 } from 'lucide-react'
import { FeedbackSubmission } from './types'
import { analyzeFeedback, generateAnalysisPdf } from './actions'
import ReactMarkdown from 'react-markdown'
import Link from 'next/link'

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

  const surveyOptions = useMemo(() => {
    const ids = Array.from(new Set(submissions.map(s => s.surveyId)))
    return ['all', ...ids]
  }, [submissions])

  const filtered = useMemo(() => {
    return selectedSurvey === 'all' ? submissions : submissions.filter(s => s.surveyId === selectedSurvey)
  }, [submissions, selectedSurvey])

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
    const avg = total > 0 ? (filtered.reduce((a, s) => a + (Number(s.rating) || 0), 0) / total) : 0
    let promoters = 0, passives = 0, detractors = 0
    for (const s of filtered) {
      const r = Number(s.rating) || 0
      if (r >= 9) promoters++
      else if (r >= 7) passives++
      else detractors++
    }
    const surveysCount = new Set(submissions.map(s => s.surveyId)).size
    return { total, avg: Number(avg.toFixed(1)), promoters, passives, detractors, surveysCount }
  }, [filtered, submissions])

  const npsData = useMemo(() => ([
    { name: 'Promoters', value: metrics.promoters },
    { name: 'Passives', value: metrics.passives },
    { name: 'Detractors', value: metrics.detractors },
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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Overview</CardTitle>
            <CardDescription>Filter submissions by survey and view trends.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-64">
                <Select onValueChange={setSelectedSurvey} value={selectedSurvey}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by survey" />
                  </SelectTrigger>
                  <SelectContent>
                    {surveyOptions.map(id => (
                      <SelectItem key={id} value={id}>{id === 'all' ? 'All Surveys' : id}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <UCard className="bg-card/80 backdrop-blur-sm border-primary/10">
                <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><ClipboardList className="h-4 w-4" /> Submissions</CardTitle><CardDescription>Total responses</CardDescription></CardHeader>
                <CardContent className="pt-0"><div className="text-3xl font-bold">{metrics.total}</div></CardContent>
              </UCard>
              <UCard className="bg-card/80 backdrop-blur-sm border-primary/10">
                <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Avg Rating</CardTitle><CardDescription>Across selection</CardDescription></CardHeader>
                <CardContent className="pt-0"><div className="text-3xl font-bold">{metrics.avg}/10</div></CardContent>
              </UCard>
              <UCard className="bg-card/80 backdrop-blur-sm border-primary/10">
                <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Gauge className="h-4 w-4" /> Promoters</CardTitle><CardDescription>9-10 scores</CardDescription></CardHeader>
                <CardContent className="pt-0"><div className="text-3xl font-bold">{metrics.promoters}</div></CardContent>
              </UCard>
              <UCard className="bg-card/80 backdrop-blur-sm border-primary/10">
                <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Surveys</CardTitle><CardDescription>Unique surveys</CardDescription></CardHeader>
                <CardContent className="pt-0"><div className="text-3xl font-bold">{selectedSurvey === 'all' ? metrics.surveysCount : 1}</div></CardContent>
              </UCard>
            </div>
            <div className="h-64">
              <ChartContainer config={{ rating: { label: 'Avg Rating', color: 'hsl(var(--primary))' } }}>
                <LineChart data={ratingOverTime} margin={{ left: 12, right: 12 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickMargin={8} />
                  <YAxis domain={[0, 10]} tickMargin={8} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Line type="monotone" dataKey="avg" stroke="var(--color-rating)" dot={false} name="Avg Rating" />
                </LineChart>
              </ChartContainer>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="h-64">
                <ChartContainer config={{ nps: { label: 'NPS Distribution', color: 'hsl(var(--primary))' } }}>
                  <BarChart data={npsData} margin={{ left: 12, right: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tickMargin={8} />
                    <YAxis allowDecimals={false} tickMargin={8} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="value" fill="var(--color-nps)" name="Count" />
                  </BarChart>
                </ChartContainer>
              </div>
              <div className="h-64">
                <ChartContainer config={{ count: { label: 'Submissions', color: 'hsl(var(--primary))' } }}>
                  <BarChart data={submissionsOverTime} margin={{ left: 12, right: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickMargin={8} />
                    <YAxis allowDecimals={false} tickMargin={8} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" fill="var(--color-count)" name="Submissions" />
                  </BarChart>
                </ChartContainer>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Feedback Analysis</CardTitle>
            <CardDescription>
              Click the button to generate an AI-powered analysis of all
              feedback submissions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleAnalyzeFeedback} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                'Analyze All Feedback'
              )}
            </Button>
            {typeof analysis === 'string' && analysis.length > 0 && (
              <Button variant="secondary" className="ml-2" onClick={handleDownloadPdf}>Download PDF</Button>
            )}
            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Analysis Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {analysis && (
              <div className="prose mt-4 rounded-lg border bg-gray-50 p-4">
                <ReactMarkdown>{analysis}</ReactMarkdown>
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
                      {new Date(submission.submittedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{submission.rating}/10</TableCell>
                    <TableCell>{submission.hospitalInteraction}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => openSubmissionModal(submission)}>View</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Submission Details</DialogTitle>
              <DialogDescription>View raw fields and run a compact AI analysis.</DialogDescription>
            </DialogHeader>
            {activeSubmission && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Date</div>
                    <div className="font-medium">{new Date(activeSubmission.submittedAt).toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Rating</div>
                    <div className="font-medium">{activeSubmission.rating}/10</div>
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Experience</div>
                  <div className="font-medium whitespace-pre-wrap break-words">{activeSubmission.hospitalInteraction}</div>
                </div>
                <details className="rounded-md border bg-card/60 p-3">
                  <summary className="cursor-pointer text-sm text-muted-foreground">All fields</summary>
                  <pre className="mt-2 max-h-64 overflow-auto rounded bg-muted/40 p-2 text-xs">{JSON.stringify(activeSubmission, null, 2)}</pre>
                </details>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={async () => {
                      if (!activeSubmission) return
                      setSingleLoading(true)
                      const { analyzeSingleFeedback } = await import('./actions')
                      const res = await analyzeSingleFeedback({ rating: activeSubmission.rating, hospitalInteraction: activeSubmission.hospitalInteraction })
                      if (!res.error) setSingleAnalysis(res.summary || null)
                      setSingleLoading(false)
                    }}
                    disabled={singleLoading}
                  >
                    {singleLoading ? 'Analyzing…' : 'Analyze this response'}
                  </Button>
                  {singleAnalysis && (
                    <Button
                      variant="secondary"
                      onClick={async () => {
                        const { generateAnalysisPdf } = await import('./actions')
                        const res = await generateAnalysisPdf({ title: 'Single Feedback Analysis', surveyId: String(activeSubmission.surveyId), analysisMarkdown: singleAnalysis || '' })
                        if (res.error || !res.pdfBase64) return
                        const link = document.createElement('a')
                        link.href = `data:application/pdf;base64,${res.pdfBase64}`
                        link.download = `single-analysis-${activeSubmission.id}.pdf`
                        link.click()
                      }}
                    >
                      Download PDF
                    </Button>
                  )}
                </div>
                {singleAnalysis && (
                  <div className="prose rounded-lg border bg-gray-50 p-4">
                    <ReactMarkdown>{singleAnalysis}</ReactMarkdown>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="secondary" onClick={closeSubmissionModal}>Close</Button>
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
  )
}
