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
  PaginationEllipsis,
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
import { Eye, MessageSquare, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';

const ITEMS_PER_PAGE = 10;
const AUTH_PASSWORD = 'scago-admin'; // This should be in an environment variable

const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

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
      <div className="flex h-screen items-center justify-center">
        <Card className="w-full max-w-sm">
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
          Insights from patient feedback submissions.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
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
      </div>

      <div className="grid gap-6 lg:grid-cols-5 mb-8">
        <Card className="lg:col-span-3">
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
            Browse through all submitted feedback.
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
                  <TableHead>Patient/Caregiver</TableHead>
                  <TableHead className="text-right">Details</TableHead>
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
                    <TableCell className="capitalize">{sub.patientOrCaregiver}</TableCell>
                    <TableCell className="text-right">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Submission Details</DialogTitle>
                          </DialogHeader>
                          <ScrollArea className="max-h-[70vh] pr-6">
                            <div className="space-y-4">
                              {Object.entries(sub).map(([key, value]) => {
                                if (key === 'id' || value === '' || value === null || (Array.isArray(value) && value.length === 0)) return null;
                                return (
                                  <div key={key} className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                                    <strong className="capitalize col-span-1">{key.replace(/([A-Z])/g, ' $1')}:</strong>
                                    <p className="col-span-2 text-muted-foreground break-words">
                                      {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : Array.isArray(value) ? value.join(', ') : String(value)}
                                    </p>
                                  </div>
                                )
                              })}
                            </div>
                          </ScrollArea>
                        </DialogContent>
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
