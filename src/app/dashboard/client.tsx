'use client'

import { useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
import { FeedbackSubmission } from './types'
import { analyzeFeedback } from './actions'
import ReactMarkdown from 'react-markdown'

const SUBMISSIONS_PER_PAGE = 10

export default function Dashboard({
  submissions,
}: {
  submissions: FeedbackSubmission[]
}) {
  const [currentPage, setCurrentPage] = useState(1)
  const [analysis, setAnalysis] = useState<any | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const totalPages = Math.ceil(submissions.length / SUBMISSIONS_PER_PAGE)

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  const paginatedSubmissions = submissions.slice(
    (currentPage - 1) * SUBMISSIONS_PER_PAGE,
    currentPage * SUBMISSIONS_PER_PAGE
  )

  const handleAnalyzeFeedback = async () => {
    setIsLoading(true)
    setError(null)
    const result = await analyzeFeedback()
    if (result.error) {
      setError(result.error)
    } else {
      setAnalysis(result.summary ?? null)
    }
    setIsLoading(false)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid gap-8">
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
