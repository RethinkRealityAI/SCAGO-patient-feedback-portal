'use client';

import { useState, useEffect } from 'react';
import { getTrendReports } from '@/app/admin/reports/actions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Loader2, RefreshCcw, TrendingUp, Users, ClipboardCheck, ArrowLeft } from 'lucide-react';
import { ReportFilters } from './ReportFilters';
import { KPICards } from './KPICards';
import { Charts } from './Charts';
import { subDays, startOfDay, endOfDay } from 'date-fns';

export function AnalyticsDashboard() {
    const router = useRouter();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);
    const [filters, setFilters] = useState({
        startDate: startOfDay(subDays(new Date(), 30)),
        endDate: endOfDay(new Date()),
        hospital: 'all',
        region: 'all',
        patientId: 'all'
    });

    const loadData = async () => {
        setLoading(true);
        try {
            const result = await getTrendReports({
                startDate: filters.startDate,
                endDate: filters.endDate,
                hospital: filters.hospital,
                region: filters.region,
                patientId: filters.patientId
            });

            if (result.success) {
                setData(result.data);
            } else {
                toast({
                    title: 'Error',
                    description: result.error || 'Failed to load analytics',
                    variant: 'destructive'
                });
            }
        } catch (error) {
            console.error('Failed to load analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [filters]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push('/admin/reports')}
                        className="mb-2 -ml-2 text-muted-foreground hover:text-primary transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Reports
                    </Button>
                    <h1 className="text-3xl font-bold tracking-tight">Program Analytics</h1>
                    <p className="text-muted-foreground">
                        Live insights from patient interactions across regions and hospitals.
                    </p>
                </div>
                <Button
                    variant="outline"
                    size="icon"
                    onClick={loadData}
                    disabled={loading}
                    className="rounded-full hover:bg-primary/10 transition-colors"
                >
                    <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
            </div>

            <ReportFilters
                filters={filters}
                setFilters={setFilters}
                disabled={loading}
            />

            {loading && !data ? (
                <div className="flex flex-col items-center justify-center py-24 gap-4">
                    <Loader2 className="h-12 w-12 animate-spin text-primary opacity-50" />
                    <p className="text-muted-foreground animate-pulse">Calculating metrics...</p>
                </div>
            ) : data ? (
                <div className="space-y-8 animate-in fade-in duration-500">
                    <KPICards summary={data.summary} />

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <Charts charts={data.charts} />
                    </div>
                </div>
            ) : (
                <Card className="border-dashed py-12">
                    <CardContent className="flex flex-col items-center justify-center text-center">
                        <ClipboardCheck className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
                        <h3 className="text-lg font-medium">No Data Available</h3>
                        <p className="text-muted-foreground">Adjust your filters to see results.</p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
