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
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    MoreHorizontal,
    Search,
    Filter,
    Plus,
    User,
    FileText,
    Calendar,
    AlertCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getPatients } from '@/app/patients/actions';
import { Patient, REGIONS, CASE_STATUSES } from '@/types/patient';
import { format } from 'date-fns';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

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

    useEffect(() => {
        loadPatients();
    }, []);

    useEffect(() => {
        filterPatients();
    }, [patients, searchTerm, statusFilter, regionFilter, hospitalFilter]);

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

        setFilteredPatients(filtered);
    }, [patients, searchTerm, statusFilter, regionFilter, hospitalFilter]);

    const handleViewProfile = (patientId: string) => {
        router.push(`/patients/${patientId}`);
    };

    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [patientToDelete, setPatientToDelete] = useState<string | null>(null);

    const handleDeleteClick = (patientId: string) => {
        setPatientToDelete(patientId);
        setDeleteDialogOpen(true);
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

    // Extract unique hospitals for filter
    const hospitals = Array.from(new Set(patients.map(p => p.hospital))).sort();

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <User className="h-5 w-5" />
                            Patients ({filteredPatients.length})
                        </CardTitle>
                        <CardDescription>
                            Manage patient records and interactions
                        </CardDescription>
                    </div>
                    <Button onClick={() => router.push('/patients/new')}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Patient
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {/* Filters */}
                <div className="space-y-4 mb-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by name, hospital, MRN..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
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
                                    {REGIONS.map(region => (
                                        <SelectItem key={region} value={region}>{region}</SelectItem>
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

                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                    setSearchTerm('');
                                    setStatusFilter('all');
                                    setRegionFilter('all');
                                    setHospitalFilter('all');
                                }}
                                title="Clear Filters"
                            >
                                <Filter className="h-4 w-4" />
                            </Button>
                        </div>
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
                                            <div className="text-xs text-muted-foreground">{patient.region}</div>
                                        </TableCell>
                                        <TableCell>{getStatusBadge(patient.caseStatus)}</TableCell>
                                        <TableCell>{getConsentBadge(patient.consentStatus)}</TableCell>
                                        <TableCell>
                                            {/* Note: lastInteraction is not in the main schema type but added dynamically in actions. 
                          Ideally we update the type definition or handle it here. 
                          For now assuming it might be missing from type but present in data. 
                          Let's cast or check safely. 
                      */}
                                            {(patient as any).lastInteraction ? (
                                                <div className="text-sm">
                                                    <div>{format((patient as any).lastInteraction.date.toDate(), 'MMM d, yyyy')}</div>
                                                    <div className="text-xs text-muted-foreground truncate max-w-[150px]">
                                                        {(patient as any).lastInteraction.summary}
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground text-xs">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                                                        <span className="sr-only">Open menu</span>
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
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
                                                        className="text-destructive"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            patient.id && handleDeleteClick(patient.id);
                                                        }}
                                                    >
                                                        Delete Patient
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
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
