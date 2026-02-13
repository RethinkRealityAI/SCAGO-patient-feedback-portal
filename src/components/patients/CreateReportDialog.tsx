'use client';

import { useMemo, useState } from 'react';
import { FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { collateProgramReport } from '@/app/patients/actions';
import type { ProgramReportData, ReportScope } from '@/types/program-report';
import { ProgramReportEditor } from '@/components/patients/ProgramReportEditor';

interface CreateReportDialogProps {
    scope: ReportScope;
    patientId?: string;
    patientIds?: string[];
    defaultHospital?: string;
    patientDisplayName?: string;
    buttonLabel?: string;
    buttonVariant?: 'default' | 'outline' | 'secondary' | 'ghost';
    className?: string;
    /** When true, the trigger button is disabled (e.g. roster with no patients). */
    disabled?: boolean;
}

export function CreateReportDialog({
    scope,
    patientId,
    patientIds,
    defaultHospital,
    patientDisplayName,
    buttonLabel = 'Create Report',
    buttonVariant = 'outline',
    className,
    disabled = false,
}: CreateReportDialogProps) {
    const today = new Date();
    const [open, setOpen] = useState(false);
    const [month, setMonth] = useState(today.getMonth() + 1);
    const [year, setYear] = useState(today.getFullYear());
    const [hospital, setHospital] = useState(defaultHospital || '');
    const [isGenerating, setIsGenerating] = useState(false);
    const [reportData, setReportData] = useState<ProgramReportData | null>(null);
    const { toast } = useToast();

    const effectiveIds = useMemo(() => {
        if (scope === 'single' && patientId) return [patientId];
        return (patientIds || []).filter(Boolean);
    }, [scope, patientId, patientIds]);

    const onGenerate = async () => {
        if (scope === 'roster' && effectiveIds.length === 0) {
            toast({
                title: 'No patients to include',
                description: 'Adjust your filters or add patients before creating a roster report.',
                variant: 'destructive',
            });
            return;
        }
        if (scope === 'single' && effectiveIds.length === 0) {
            toast({
                title: 'Patient required',
                description: 'No patient selected for this report.',
                variant: 'destructive',
            });
            return;
        }
        setIsGenerating(true);
        try {
            const result = await collateProgramReport({
                month,
                year,
                patientIds: effectiveIds,
                hospital: hospital.trim() || undefined,
            });

            if (!result.success || !result.data) {
                toast({
                    title: 'Report generation failed',
                    description: result.error || 'Could not collate report data.',
                    variant: 'destructive',
                });
                return;
            }

            setReportData({
                ...result.data,
                patientDisplayName: result.data.patientDisplayName || patientDisplayName,
            });
        } catch (error) {
            console.error('Error generating report:', error);
            toast({
                title: 'Report generation failed',
                description: 'An unexpected error occurred while generating the report.',
                variant: 'destructive',
            });
        } finally {
            setIsGenerating(false);
        }
    };

    const closeDialog = () => setOpen(false);

    const handleOpenChange = (nextOpen: boolean) => {
        setOpen(nextOpen);
        if (!nextOpen) setReportData(null);
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button variant={buttonVariant} className={className} disabled={disabled}>
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    {buttonLabel}
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
                {!reportData ? (
                    <>
                        <DialogHeader>
                            <DialogTitle>Create Program Report</DialogTitle>
                            <DialogDescription>
                                Generate a monthly report for {scope === 'single' ? 'this patient' : 'the current patient roster'} and edit before export.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-2">
                            <div className="space-y-1">
                                <Label htmlFor="report-month">Month</Label>
                                <Input
                                    id="report-month"
                                    type="number"
                                    min={1}
                                    max={12}
                                    value={month}
                                    onChange={(e) => setMonth(Number(e.target.value || month))}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="report-year">Year</Label>
                                <Input
                                    id="report-year"
                                    type="number"
                                    min={2024}
                                    value={year}
                                    onChange={(e) => setYear(Number(e.target.value || year))}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="report-hospital">Hospital (optional)</Label>
                                <Input
                                    id="report-hospital"
                                    placeholder="All hospitals"
                                    value={hospital}
                                    onChange={(e) => setHospital(e.target.value)}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="ghost" onClick={closeDialog}>
                                Cancel
                            </Button>
                            <Button onClick={onGenerate} disabled={isGenerating}>
                                {isGenerating ? 'Generating...' : 'Generate Report'}
                            </Button>
                        </DialogFooter>
                    </>
                ) : (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-semibold">Edit and Export Report</h3>
                                <p className="text-sm text-muted-foreground">
                                    Review autogenerated values, update missing metrics, then export to PDF or CSV.
                                </p>
                            </div>
                            <Button variant="outline" onClick={() => setReportData(null)}>
                                Back
                            </Button>
                        </div>
                        <ProgramReportEditor initialData={reportData} />
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
