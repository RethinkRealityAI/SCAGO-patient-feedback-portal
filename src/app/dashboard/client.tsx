
'use client';

import { useState, useMemo } from 'react';
import type { FeedbackSubmission } from './types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Eye, MessageSquare, Star, Sparkles, Loader2, Bot, FileText, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { analyzeFeedback } from '@/ai/flows/analyze-feedback-flow';
import type { FeedbackAnalysisOutput } from '@/ai/flows/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

const ITEMS_PER_PAGE = 10;
const AUTH_PASSWORD = 'scago-admin'; // This should be in an environment variable

const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

function SubmissionDetailsDialog({ submission }: { submission: FeedbackSubmission }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<FeedbackAnalysisOutput | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setAnalysis(null);
    setAnalysisError(null);
    try {
      const result = await analyzeFeedback({
        feedbackText: submission.feedbackText || '',
        location: submission.location,
        rating: submission.rating,
      });
      setAnalysis(result);
    } catch (error) {
      console.error('Analysis failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
       setAnalysisError(`Failed to analyze feedback. Please ensure your Google AI API key is correctly configured in a .env.local file and that your project has access to the Gemini API. Error: ${errorMessage}`);
       toast({
        variant: 'destructive',
        title: 'Analysis Failed',
        description: `Please check your Google AI API key and project settings.`,
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getSentimentVariant = (sentiment: FeedbackAnalysisOutput['sentiment']) => {
    switch (sentiment) {
      case 'Positive':
        return 'default';
      case 'Negative':
        return 'destructive';
      case 'Neutral':
        return 'secondary';
      default:
        return 'outline';
    }
  };


  return (
     <DialogContent className="max-w-4xl">
      <DialogHeader>
        <DialogTitle>Submission Details</DialogTitle>
        <DialogDescription>
          Detailed view of a patient feedback submission.
        </DialogDescription>
      </DialogHeader>
      <ScrollArea className="max-h-[70vh] pr-6">
        <div className="grid gap-6 md:grid-cols-2">
            {/* Original Submission Data */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-primary">Original Submission</h3>
              <div className="space-y-3 rounded-md border p-4">
                {Object.entries(submission).map(([key, value]) => {
                  if (key === 'id' || value === '' || value === null || (Array.isArray(value) && value.length === 0)) return null;
                   // Format date for display
                  const displayValue = key === 'submittedAt' && value instanceof Date
                    ? format(value, 'PPP p')
                    : typeof value === 'boolean'
                    ? (value ? 'Yes' : 'No')
                    : Array.isArray(value)
                    ? value.join(', ')
                    : String(value);
                  return (
                    <div key={key} className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                      <strong className="capitalize col-span-1">{key.replace(/([A-Z])/g, ' $1')}:</strong>
                      <p className="col-span-2 text-muted-foreground break-words">
                        {displayValue}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>

             {/* AI Analysis Section */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                 <h3 className="font-semibold text-lg text-primary">AI-Powered Analysis</h3>
                 <Button onClick={handleAnalyze} disabled={isAnalyzing} size="sm">
                  {isAnalyzing ? <Loader2 className="mr-2 animate-spin" /> : <Sparkles className="mr-2" />}
                  Analyze with AI
                </Button>
              </div>

              <div className="space-y-4 rounded-md border p-4 min-h-[200px]">
                {isAnalyzing && (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="ml-2 text-muted-foreground">Analyzing...</p>
                  </div>
                )}
                 {analysisError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{analysisError}</AlertDescription>
                  </Alert>
                )}
                {analysis && (
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold">Sentiment</h4>
                      <Badge variant={getSentimentVariant(analysis.sentiment)}>{analysis.sentiment}</Badge>
                    </div>
                     <div>
                      <h4 className="font-semibold">Summary</h4>
                      <p className="text-muted-foreground text-sm">{analysis.summary}</p>
                    </div>
                     <div>
                      <h4 className="font-semibold">Key Topics</h4>
                       <div className="flex flex-wrap gap-2">
                        {analysis.keyTopics.map(topic => <Badge key={topic} variant="secondary">{topic}</Badge>)}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold">Suggested Actions</h4>
                      <ul className="list-disc pl-5 text-muted-foreground text-sm space-y-1">
                        {analysis.suggestedActions.map(action => <li key={action}>{action}</li>)}
                      </ul>
                    </div>
                  </div>
                )}
                 {!isAnalyzing && !analysis && !analysisError && (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <Sparkles className="h-8 w-8 text-muted-foreground/50" />
                    <p className="text-muted-foreground mt-2">Click "Analyze with AI" to generate insights.</p>
                  </div>
                )}
              </div>
            </div>
        </div>
      </ScrollArea>
    </DialogContent>
  );
}

export default function DashboardClient({ submissions }: { submissions: FeedbackSubmission[] }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === AUTH_PASSWORD) {
      setIsAuthenticated(true);
      setError('');
    } else {
      setError('Incorrect password. Please try again.');
    }
  };

  const totalSubmissions = submissions.length;
  const averageRating = useMemo(() => {
    if (totalSubmissions === 0) return 0;
    const totalRating = submissions.reduce((acc, sub) => acc + (sub.rating || 0), 0);
    return (totalRating / totalSubmissions).toFixed(1);
  }, [submissions, totalSubmissions]);

  const ratingDistribution = useMemo(() => {
    const distribution = [
      { rating: 1, count: 0 },
      { rating: 2, count: 0 },
      { rating: 3, count: 0 },
      { rating: 4, count: 0 },
      { rating: 5, count: 0 },
    ];
    submissions.forEach(sub => {
      if (sub.rating >= 1 && sub.rating <= 5) {
        distribution[sub.rating - 1].count++;
      }
    });
    return distribution;
  }, [submissions]);

  const paginatedSubmissions = submissions.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const totalPages = Math.ceil(submissions.length / ITEMS_PER_PAGE);

  const handlePageChange = (page: number) => {
    if (page > 0 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100/50 dark:bg-gray-900/50">
        <Card className="w-full max-w-sm shadow-lg">
          <CardHeader>
            <CardTitle>Dashboard Access</CardTitle>
            <CardDescription>
              Please enter the password to view the dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full">
                Login
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-primary">Feedback Dashboard</h1>
        <p className="text-muted-foreground">
          AI-powered insights from patient feedback submissions.
        </p>
      </header>

      <section className="mb-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
           <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Submissions
                </CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalSubmissions}</div>
                <p className="text-xs text-muted-foreground">
                  Total feedback forms received
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
                <Star className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{averageRating} / 5</div>
                <p className="text-xs text-muted-foreground">
                  Average overall experience rating
                </p>
              </CardContent>
            </Card>
             <Button variant="outline" className="lg:col-span-1 h-full text-left flex-col items-start justify-center gap-2 p-4" disabled>
                <div className="flex items-center gap-2">
                  <Bot className="h-6 w-6" />
                  <span className="text-lg font-semibold">Chat with Data</span>
                </div>
                <p className="text-sm text-muted-foreground">Ask AI questions about the feedback. (Coming Soon)</p>
            </Button>
            <Button variant="outline" className="lg:col-span-1 h-full text-left flex-col items-start justify-center gap-2 p-4" disabled>
                 <div className="flex items-center gap-2">
                  <FileText className="h-6 w-6" />
                  <span className="text-lg font-semibold">Generate Report</span>
                </div>
                <p className="text-sm text-muted-foreground">Create a PDF summary of feedback. (Coming Soon)</p>
            </Button>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-1 mb-8">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Rating Distribution</CardTitle>
            <CardDescription>
              Number of submissions for each star rating.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={ratingDistribution} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="rating" tickFormatter={(value) => `${value} Star`} />
                <YAxis allowDecimals={false} />
                <Tooltip
                  cursor={{ fill: 'hsl(var(--accent))' }}
                  contentStyle={{
                    background: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                  }}
                />
                <Bar dataKey="count" name="Submissions" radius={[4, 4, 0, 0]}>
                  {ratingDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[entry.rating - 1]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Submissions</CardTitle>
          <CardDescription>
            Browse through all submitted feedback. Click the eye icon to view details and analyze.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-center">Rating</TableHead>
                  <TableHead>Hospital</TableHead>
                  <TableHead>Key Reason</TableHead>
                  <TableHead className="text-right">View & Analyze</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedSubmissions.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell>
                      {format(new Date(sub.submittedAt), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-center">{sub.rating}</TableCell>
                    <TableCell>{sub.location}</TableCell>
                    <TableCell>{sub.visitReason}</TableCell>
                    <TableCell className="text-right">
                       <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <SubmissionDetailsDialog submission={sub} />
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <Pagination className="mt-6">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    handlePageChange(currentPage - 1);
                  }}
                  aria-disabled={currentPage === 1}
                  className={currentPage === 1 ? "pointer-events-none opacity-50" : undefined}
                />
              </PaginationItem>
              
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <PaginationItem key={page}>
                    <PaginationLink 
                        href="#"
                        onClick={(e) => { e.preventDefault(); handlePageChange(page); }}
                        isActive={currentPage === page}
                    >
                        {page}
                    </PaginationLink>
                  </PaginationItem>
              ))}

              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    handlePageChange(currentPage + 1);
                  }}
                  aria-disabled={currentPage === totalPages}
                   className={currentPage === totalPages ? "pointer-events-none opacity-50" : undefined}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </CardContent>
      </Card>
    </div>
  );
}

    