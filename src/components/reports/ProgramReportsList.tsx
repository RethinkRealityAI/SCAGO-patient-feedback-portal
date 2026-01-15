'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Plus, FileText, Calendar, Building2, Trash2, Edit } from 'lucide-react';
import { format } from 'date-fns';
import { getReports, deleteReport } from '@/app/admin/reports/actions';
import { ProgramReport } from '@/types/report';
import { useToast } from '@/hooks/use-toast';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

export function ProgramReportsList() {
    const router = useRouter();
    const { toast } = useToast();
    const [reports, setReports] = useState<ProgramReport[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [hospitalFilter, setHospitalFilter] = useState<string>('all');
    const [yearFilter, setYearFilter] = useState<string>(new Date().getFullYear().toString());

    // Delete state
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [reportToDelete, setReportToDelete] = useState<string | null>(null);

    useEffect(() => {
        loadReports();
    }, [hospitalFilter, yearFilter]);

    const loadReports = async () => {
        setIsLoading(true);
        try {
            const filters: any = {};
            if (hospitalFilter !== 'all') filters.hospital = hospitalFilter;
            if (yearFilter !== 'all') filters.year = parseInt(yearFilter);

            const result = await getReports(filters);
            if (result.success && result.data) {
                setReports(result.data);
            } else {
                toast({
                    title: 'Error',
                    description: result.error || 'Failed to load reports',
                    variant: 'destructive',
                });
            }
        } catch (error) {
            console.error('Error loading reports:', error);
            toast({
                title: 'Error',
                description: 'Failed to load reports',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteClick = (id: string) => {
        setReportToDelete(id);
        setDeleteDialogOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!reportToDelete) return;
        try {
            const result = await deleteReport(reportToDelete);
            if (result.success) {
                toast({
                    title: 'Report Deleted',
                    description: 'The report has been successfully deleted.',
                });
                loadReports();
            } else {
                toast({
                    title: 'Error',
                    description: result.error || 'Failed to delete report',
                    variant: 'destructive',
                });
            }
        } catch (error) {
            console.error('Error deleting report:', error);
            toast({
                title: 'Error',
                description: 'An unexpected error occurred',
                variant: 'destructive',
            });
        } finally {
            setDeleteDialogOpen(false);
            setReportToDelete(null);
        }
    };

    // Unique hospitals for filter
    const hospitals = Array.from(new Set(reports.map(r => r.hospital))).sort();
    const years = [2024, 2025, 2026]; // Dynamic generation would be better

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            Program Reports
                        </CardTitle>
                        <CardDescription>
                            Manage monthly program metrics reports for hospitals.
                        </CardDescription>
                    </div>
                    <Button onClick={() => router.push('/admin/reports/new')}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Report
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex gap-4 mb-6">
                    <Select value={hospitalFilter} onValueChange={setHospitalFilter}>
                        <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Filter by Hospital" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Hospitals</SelectItem>
                            {hospitals.map(h => (
                                <SelectItem key={h} value={h}>{h}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={yearFilter} onValueChange={setYearFilter}>
                        <SelectTrigger className="w-[120px]">
                            <SelectValue placeholder="Year" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Years</SelectItem>
                            {years.map(y => (
                                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Period</TableHead>
                                <TableHead>Hospital</TableHead>
                                <TableHead>Created By</TableHead>
                                <TableHead>Created At</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8">Loading reports...</TableCell>
                                </TableRow>
                            ) : reports.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No reports found.</TableCell>
                                </TableRow>
                            ) : (
                                reports.map((report) => (
                                    <TableRow key={report.id}>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                                {format(new Date(report.year, report.month - 1), 'MMMM yyyy')}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Building2 className="h-4 w-4 text-muted-foreground" />
                                                {report.hospital}
                                            </div>
                                        </TableCell>
                                        <TableCell>{report.createdBy || '-'}</TableCell>
                                        <TableCell>
                                            {report.createdAt ? format(report.createdAt, 'MMM d, yyyy') : '-'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" size="icon" onClick={() => router.push(`/admin/reports/${report.id}`)}>
                                                    <Edit className="h-4 w-4 text-blue-500" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => report.id && handleDeleteClick(report.id)}>
                                                    <Trash2 className="h-4 w-4 text-red-500" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>

            <ConfirmDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                onConfirm={handleDeleteConfirm}
                title="Delete Report"
                description="Are you sure you want to delete this report? This action cannot be undone."
                confirmText="Delete"
                cancelText="Cancel"
                variant="destructive"
            />
        </Card>
    );
}
