'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuCheckboxItem
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
    Pencil,
    MoreVertical,
    Search,
    Filter,
    Plus,
    User,
    FileText,
    Calendar,
    AlertCircle,
    ChevronDown,
    Download
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getPatients } from '@/app/patients/actions';
import { Patient, DEFAULT_REGIONS, CASE_STATUSES, PATIENT_NEEDS, getRegionDisplayLabel, getRegionDisplayWithCity } from '@/types/patient';
import { getRegions } from '@/app/admin/user-actions';
import { format, differenceInDays, subDays } from 'date-fns';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { cn } from '@/lib/utils';

export function PatientList() {
    const router = useRouter();
    const { toast } = useToast();
    const [patients, setPatients] = useState<Patient[]>([]);
    const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [regionFilter, setRegionFilter] = useState<string>('all');
    const [hospitalFilter, setHospitalFilter] = useState<string>('all');
    const [needsFilter, setNeedsFilter] = useState<string>('all');
    const [timeFilter, setTimeFilter] = useState<string>('all'); // all, new_7_days, overdue_30_days
    const [ageFilter, setAgeFilter] = useState<string>('all'); // all, pediatric, adult
    const [regions, setRegions] = useState<string[]>([]);

    useEffect(() => {
        loadPatients();
    }, []);

    useEffect(() => {
        getRegions().then(setRegions);
    }, []);

    useEffect(() => {
        filterPatients();
    }, [patients, searchTerm, statusFilter, regionFilter, hospitalFilter, needsFilter, timeFilter, ageFilter]);

    const loadPatients = async () => {
        setIsLoading(true);
        try {
            const result = await getPatients();
            if (result.success && result.data) {
                setPatients(result.data);
            } else {
                toast({
                    title: 'Error',
                    description: result.error || 'Failed to load patients',
                    variant: 'destructive',
                });
            }
        } catch (error) {
            console.error('Error loading patients:', error);
            toast({
                title: 'Error',
                description: 'Failed to load patients',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const filterPatients = useCallback(() => {
        let filtered = patients;

        // Search filter
        if (searchTerm) {
            const q = searchTerm.toLowerCase();
            filtered = filtered.filter(p =>
                p.fullName.toLowerCase().includes(q) ||
                p.hospital.toLowerCase().includes(q) ||
                p.diagnosis.toLowerCase().includes(q) ||
                (p.mrn || '').toLowerCase().includes(q)
            );
        }

        // Status filter
        if (statusFilter !== 'all') {
            filtered = filtered.filter(p => p.caseStatus === statusFilter);
        }

        // Region filter
        if (regionFilter !== 'all') {
            filtered = filtered.filter(p => p.region === regionFilter);
        }

        // Hospital filter
        if (hospitalFilter !== 'all') {
            filtered = filtered.filter(p => p.hospital === hospitalFilter);
        }

        // Needs filter
        if (needsFilter !== 'all') {
            filtered = filtered.filter(p => p.needs && p.needs.includes(needsFilter));
        }

        // Time filter (New / Overdue)
        if (timeFilter === 'new_7_days') {
            const sevenDaysAgo = subDays(new Date(), 7);
            filtered = filtered.filter(p => p.createdAt && new Date(p.createdAt) >= sevenDaysAgo);
        } else if (timeFilter === 'overdue_30_days') {
            filtered = filtered.filter(p => {
                if (!p.lastInteraction) return true; // Never interacted matches overdue logic
                return differenceInDays(new Date(), p.lastInteraction.date) > 30;
            });
        }

        // Age filter (Pediatric < 18, Adult >= 18)
        if (ageFilter !== 'all') {
            filtered = filtered.filter(p => {
                const age = differenceInDays(new Date(), new Date(p.dateOfBirth)) / 365.25;
                if (ageFilter === 'pediatric') return age < 18;
                if (ageFilter === 'adult') return age >= 18;
                return true;
            });
        }

        setFilteredPatients(filtered);
    }, [patients, searchTerm, statusFilter, regionFilter, hospitalFilter, needsFilter, timeFilter, ageFilter]);

    const handleViewProfile = (patientId: string) => {
        router.push(`/patients/${patientId}`);
    };

    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [patientToDelete, setPatientToDelete] = useState<string | null>(null);

    const handleDeleteClick = (patientId: string) => {
        setPatientToDelete(patientId);
        setDeleteDialogOpen(true);
    };

    const handleExportCSV = async () => {
        try {
            const { exportPatientsToCSV } = await import('@/app/patients/actions');
            // Filter by current search/filter criteria if needed, or just export visible patients
            // For now, let's export all visible patients by passing their IDs
            const patientIds = filteredPatients.map(p => p.id).filter(id => id !== undefined) as string[];

            if (patientIds.length === 0) {
                toast({
                    title: 'No Patients',
                    description: 'No patients to export based on current filters.',
                    variant: 'default',
                });
                return;
            }

            const result = await exportPatientsToCSV(patientIds);

            if (result.success && result.data) {
                // Create a blob and download
                const blob = new Blob([result.data], { type: 'text/csv' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `patients_export_${format(new Date(), 'yyyy-MM-dd')}.csv`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);

                toast({
                    title: 'Export Successful',
                    description: `Exported ${patientIds.length} patient records.`,
                });
            } else {
                toast({
                    title: 'Error',
                    description: result.error || 'Failed to export patients',
                    variant: 'destructive',
                });
            }
        } catch (error) {
            console.error('Error export patients:', error);
            toast({
                title: 'Error',
                description: 'An unexpected error occurred during export',
                variant: 'destructive',
            });
        }
    };

    const handleDeleteConfirm = async () => {
        if (!patientToDelete) return;

        try {
            const { deletePatient } = await import('@/app/patients/actions');
            const result = await deletePatient(patientToDelete);

            if (result.success) {
                toast({
                    title: 'Patient Deleted',
                    description: 'Patient record has been permanently deleted.',
                });
                loadPatients(); // Reload the list
            } else {
                toast({
                    title: 'Error',
                    description: result.error || 'Failed to delete patient',
                    variant: 'destructive',
                });
            }
        } catch (error) {
            console.error('Error deleting patient:', error);
            toast({
                title: 'Error',
                description: 'An unexpected error occurred',
                variant: 'destructive',
            });
        } finally {
            setDeleteDialogOpen(false);
            setPatientToDelete(null);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'active':
                return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Active</Badge>;
            case 'inactive':
                return <Badge variant="secondary">Inactive</Badge>;
            case 'closed':
                return <Badge variant="outline">Closed</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    const getConsentBadge = (status: string) => {
        if (status === 'on_file') {
            return <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">Consent on File</Badge>;
        }
        return <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">Missing Consent</Badge>;
    };

    const isOverdue = (patient: Patient) => {
        if (!patient.lastInteraction) return false;
        // date is guaranteed to be a Date object now due to actions.ts update
        return differenceInDays(new Date(), patient.lastInteraction.date) > 30;
    };

    // Extract unique hospitals for filter
    const hospitals = Array.from(new Set(patients.map(p => p.hospital))).sort();

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20 shadow-sm">
                            <User className="h-6 w-6 text-primary" fill="currentColor" />
                        </div>
                        <div>
                            <CardTitle className="text-2xl font-bold tracking-tight">
                                Patient Directory
                            </CardTitle>
                            <CardDescription className="text-base">
                                Manage and track active patient records ({filteredPatients.length} total)
                            </CardDescription>
                        </div>
                    </div>
                    <div className="flex gap-3 w-full sm:w-auto">
                        <Button variant="outline" onClick={handleExportCSV} className="flex-1 sm:flex-none rounded-xl h-11 border-primary/20 hover:bg-primary/5 transition-colors">
                            <Download className="h-4 w-4 mr-2" />
                            Export Data
                        </Button>
                        <Button onClick={() => router.push('/patients/new')} className="flex-1 sm:flex-none rounded-xl h-11 shadow-lg shadow-primary/20 transition-all active:scale-95">
                            <Plus className="h-5 w-5 mr-2" />
                            Add Patient
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {/* Filters */}
                <div className="space-y-4 mb-6">
                    <div className="flex flex-col md:flex-row gap-4 flex-wrap">
                        <div className="flex-1 relative min-w-[250px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/70" fill="currentColor" />
                            <Input
                                placeholder="Search patients by name, hospital, MRN..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 h-11 rounded-xl border-primary/10 focus-visible:ring-primary/20 transition-all shadow-sm"
                            />
                        </div>

                        <Select value={timeFilter} onValueChange={setTimeFilter}>
                            <SelectTrigger className="w-[160px]">
                                <SelectValue placeholder="Time Period" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Time</SelectItem>
                                <SelectItem value="new_7_days">New (Last 7 Days)</SelectItem>
                                <SelectItem value="overdue_30_days">Overdue (&gt;30 Days)</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={ageFilter} onValueChange={setAgeFilter}>
                            <SelectTrigger className="w-[140px]">
                                <SelectValue placeholder="Age Group" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Ages</SelectItem>
                                <SelectItem value="pediatric">Pediatric (&lt;18)</SelectItem>
                                <SelectItem value="adult">Adult (18+)</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[140px]">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                {CASE_STATUSES.map(status => (
                                    <SelectItem key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={regionFilter} onValueChange={setRegionFilter}>
                            <SelectTrigger className="w-[140px]">
                                <SelectValue placeholder="Region" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Regions</SelectItem>
                                {(regions.length ? regions : DEFAULT_REGIONS).map(region => (
                                    <SelectItem key={region} value={region}>{getRegionDisplayLabel(region)}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={hospitalFilter} onValueChange={setHospitalFilter}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Hospital" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Hospitals</SelectItem>
                                {hospitals.map(hospital => (
                                    <SelectItem key={hospital} value={hospital}>{hospital}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={needsFilter} onValueChange={setNeedsFilter}>
                            <SelectTrigger className="w-[160px]">
                                <SelectValue placeholder="Needs" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Needs</SelectItem>
                                {PATIENT_NEEDS.map(need => (
                                    <SelectItem key={need} value={need}>{need.replace(/_/g, ' ')}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                                setSearchTerm('');
                                setStatusFilter('all');
                                setRegionFilter('all');
                                setHospitalFilter('all');
                                setNeedsFilter('all');
                                setTimeFilter('all');
                                setAgeFilter('all');
                            }}
                            title="Clear Filters"
                            className="rounded-xl"
                        >
                            <Filter className="h-4 w-4 text-primary/70" fill="currentColor" />
                        </Button>
                    </div>
                </div>

                {/* Table */}
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Hospital / Region</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Consent</TableHead>
                                <TableHead>Last Interaction</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8">
                                        Loading patients...
                                    </TableCell>
                                </TableRow>
                            ) : filteredPatients.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                        No patients found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredPatients.map((patient) => (
                                    <TableRow key={patient.id} className="cursor-pointer hover:bg-muted/50" onClick={() => patient.id && handleViewProfile(patient.id)}>
                                        <TableCell className="font-medium">
                                            <div>{patient.fullName}</div>
                                            {patient.mrn && <div className="text-xs text-muted-foreground">MRN: {patient.mrn}</div>}
                                        </TableCell>
                                        <TableCell>
                                            <div>{patient.hospital}</div>
                                            <div className="text-xs text-muted-foreground">{getRegionDisplayWithCity(patient.region, patient.intakeCity ?? patient.intakeRegionResolution)}</div>
                                        </TableCell>
                                        <TableCell>{getStatusBadge(patient.caseStatus)}</TableCell>
                                        <TableCell>{getConsentBadge(patient.consentStatus)}</TableCell>
                                        <TableCell>
                                            {patient.lastInteraction ? (
                                                <div className="text-sm">
                                                    <div className={cn(isOverdue(patient) ? "text-red-500 font-medium" : "")}>
                                                        {format(patient.lastInteraction.date, 'MMM d, yyyy')}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground truncate max-w-[150px]">
                                                        {patient.lastInteraction.summary}
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground text-xs">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex items-center justify-end gap-0.5">
                                                <TooltipProvider delayDuration={300}>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                                onClick={() => patient.id && handleViewProfile(patient.id)}
                                                            >
                                                                <Pencil className="h-4 w-4" />
                                                                <span className="sr-only">View profile / Edit</span>
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="left">View profile / Edit</TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                                                            <span className="sr-only">More actions</span>
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); patient.id && handleViewProfile(patient.id); }}>
                                                            <User className="mr-2 h-4 w-4" />
                                                            View Profile
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); /* Add interaction handler */ }}>
                                                            <Calendar className="mr-2 h-4 w-4" />
                                                            Log Interaction
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            className="text-destructive focus:text-destructive"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                patient.id && handleDeleteClick(patient.id);
                                                            }}
                                                        >
                                                            Delete Patient
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>

            {/* Delete Confirmation Dialog */}
            <ConfirmDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                onConfirm={handleDeleteConfirm}
                title="Delete Patient"
                description="Are you sure you want to delete this patient? This action cannot be undone and will permanently remove all patient data, interactions, and documents."
                confirmText="Delete"
                cancelText="Cancel"
                variant="destructive"
            />
        </Card>
    );
}
