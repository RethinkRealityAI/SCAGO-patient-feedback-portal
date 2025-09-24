'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AreaChart, BarChart, XAxis, YAxis, Tooltip, Bar, Area, ResponsiveContainer } from 'recharts';
import type { FeedbackSubmission } from './types';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const NPS_THRESHOLDS = {
    bad: 3,
    medium: 6,
    good: 8,
    great: 10
}

const getRatingColor = (rating: number) => {
    if (rating <= NPS_THRESHOLDS.bad) return 'bg-red-500';
    if (rating <= NPS_THRESHOLDS.medium) return 'bg-orange-500';
    if (rating <= NPS_THRESHOLDS.good) return 'bg-yellow-500';
    return 'bg-green-500';
};

const AnalyticsTab = ({ submissions }: { submissions: FeedbackSubmission[] }) => {
    const totalSubmissions = submissions.length;
    const averageRating = useMemo(() => {
        if (submissions.length === 0) return 0;
        const total = submissions.reduce((acc, s) => acc + s.rating, 0);
        return (total / submissions.length).toFixed(1);
    }, [submissions]);

    const ratingDistribution = useMemo(() => {
        const counts = new Array(10).fill(0);
        submissions.forEach(s => {
            if (s.rating >= 1 && s.rating <= 10) {
                counts[s.rating - 1]++;
            }
        });
        return counts.map((count, index) => ({ rating: index + 1, count }));
    }, [submissions]);

    const submissionsOverTime = useMemo(() => {
        const counts = submissions.reduce((acc, s) => {
            const date = format(s.submittedAt, 'yyyy-MM-dd');
            acc[date] = (acc[date] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        
        return Object.entries(counts)
            .map(([date, count]) => ({ date, count }))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [submissions]);

    return (
        <div className="space-y-8">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader><CardTitle>Total Submissions</CardTitle></CardHeader>
                    <CardContent><p className="text-4xl font-bold">{totalSubmissions}</p></CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Average Rating</CardTitle></CardHeader>
                    <CardContent><p className="text-4xl font-bold">{averageRating}</p></CardContent>
                </Card>
            </div>
            <Card>
                <CardHeader><CardTitle>Rating Distribution</CardTitle></CardHeader>
                <CardContent className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={ratingDistribution}>
                            <XAxis dataKey="rating" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="count" fill="#8884d8" />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
            <Card>
                <CardHeader><CardTitle>Submissions Over Time</CardTitle></CardHeader>
                <CardContent className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={submissionsOverTime}>
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip />
                            <Area type="monotone" dataKey="count" stroke="#8884d8" fill="#8884d8" />
                        </AreaChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
    );
};

const SubmissionsTab = ({ submissions }: { submissions: FeedbackSubmission[] }) => {
    return (
        <Card>
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Submitted</TableHead>
                            <TableHead>Rating</TableHead>
                            <TableHead>Experience</TableHead>
                            <TableHead></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {submissions.map((s) => (
                            <TableRow key={s.id}>
                                <TableCell className="whitespace-nowrap">{format(s.submittedAt, 'PPp')}</TableCell>
                                <TableCell><Badge className={cn('text-white', getRatingColor(s.rating))}>{s.rating}</Badge></TableCell>
                                <TableCell className="max-w-xs truncate">{s.hospitalInteraction}</TableCell>
                                <TableCell>
                                    <Dialog>
                                        <DialogTrigger asChild><Button variant="outline" size="sm">View</Button></DialogTrigger>
                                        <DialogContent className="sm:max-w-3xl">
                                            <DialogHeader><DialogTitle>Submission Details</DialogTitle><DialogDescription>Submitted on {format(s.submittedAt, 'PPp')}</DialogDescription></DialogHeader>
                                            <div className="space-y-4 max-h-[70vh] overflow-y-auto p-4 border rounded-md">
                                                {Object.entries(s).map(([key, value]) => (
                                                    <div key={key} className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4 break-words">
                                                        <strong className="capitalize col-span-1 text-muted-foreground">{key.replace(/([A-Z])/g, ' $1')}</strong>
                                                        <p className="col-span-2">{Array.isArray(value) ? value.join(', ') : String(value)}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </Card>
    );
};

export default function DashboardClient({ submissions }: { submissions: FeedbackSubmission[] }) {
    return (
        <Tabs defaultValue="analytics" className="space-y-4">
            <TabsList className="overflow-x-auto whitespace-nowrap">
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
                <TabsTrigger value="submissions">Submissions</TabsTrigger>
                <TabsTrigger value="ai-tools" disabled>AI Tools (Coming Soon)</TabsTrigger>
            </TabsList>
            <TabsContent value="analytics"><AnalyticsTab submissions={submissions} /></TabsContent>
            <TabsContent value="submissions"><SubmissionsTab submissions={submissions} /></TabsContent>
        </Tabs>
    );
}
