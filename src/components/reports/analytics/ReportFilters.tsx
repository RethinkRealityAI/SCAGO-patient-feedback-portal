'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { ontarioHospitals } from '@/lib/hospital-names';
import { DEFAULT_REGIONS, Patient, getRegionDisplayLabel } from '@/types/patient';
import { getRegions } from '@/app/admin/user-actions';
import { format, parseISO, startOfDay, endOfDay } from 'date-fns';
import { getPatients, searchPatients } from '@/app/patients/actions';
import { Search, User } from 'lucide-react';

interface ReportFiltersProps {
    filters: {
        startDate: Date;
        endDate: Date;
        hospital: string;
        region: string;
        patientId: string;
    };
    setFilters: (filters: any) => void;
    disabled?: boolean;
}

export function ReportFilters({ filters, setFilters, disabled }: ReportFiltersProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [patients, setPatients] = useState<Patient[]>([]);
    const [initialPatients, setInitialPatients] = useState<Patient[]>([]);
    const [searching, setSearching] = useState(false);
    const [regions, setRegions] = useState<string[]>([]);

    useEffect(() => {
        getRegions().then(setRegions);
    }, []);

    // Preload initial patients
    useEffect(() => {
        const loadInitial = async () => {
            const result = await getPatients({ pageSize: 15 });
            if (result.success && result.data) {
                setInitialPatients(result.data);
                setPatients(result.data);
            }
        };
        loadInitial();
    }, []);

    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (searchTerm.length >= 2) {
                setSearching(true);
                try {
                    const result = await searchPatients(searchTerm);
                    if (result.success && result.data) {
                        setPatients(result.data);
                    }
                } finally {
                    setSearching(false);
                }
            } else if (searchTerm === '') {
                setPatients(initialPatients);
            }
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, initialPatients]);

    return (
        <Card className="border-none bg-card/50 backdrop-blur-md shadow-lg">
            <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                    <div className="space-y-2 lg:col-span-1">
                        <Label>Specific Patient</Label>
                        <Select
                            value={filters.patientId}
                            onValueChange={(val) => setFilters({ ...filters, patientId: val })}
                            disabled={disabled}
                        >
                            <SelectTrigger className="bg-background/50 border-primary/10 focus:ring-primary h-10">
                                <SelectValue placeholder="All Patients" />
                            </SelectTrigger>
                            <SelectContent>
                                <div className="p-2 border-b border-border/50">
                                    <div className="relative">
                                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Search patient..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            onKeyDown={(e) => e.stopPropagation()}
                                            onClick={(e) => e.stopPropagation()}
                                            className="pl-8 h-9 border-none bg-accent/50 focus-visible:ring-0"
                                        />
                                    </div>
                                </div>
                                <SelectItem value="all">All Patients</SelectItem>
                                {patients.map((p) => (
                                    <SelectItem key={p.id} value={p.id!}>
                                        <span className="flex items-center gap-2">
                                            <User className="h-3 w-3 opacity-50" />
                                            {p.fullName}
                                        </span>
                                    </SelectItem>
                                ))}
                                {searching && <div className="p-2 text-xs text-center text-muted-foreground animate-pulse">Searching...</div>}
                                {!searching && searchTerm.length >= 2 && patients.length === 0 && (
                                    <div className="p-2 text-xs text-center text-muted-foreground">No patients found</div>
                                )}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Start Date</Label>
                        <Input
                            type="date"
                            value={format(filters.startDate, 'yyyy-MM-dd')}
                            onChange={(e) => {
                                const date = parseISO(e.target.value);
                                setFilters({ ...filters, startDate: startOfDay(date) });
                            }}
                            disabled={disabled}
                            className="bg-background/50 border-primary/10 focus-visible:ring-primary h-10"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>End Date</Label>
                        <Input
                            type="date"
                            value={format(filters.endDate, 'yyyy-MM-dd')}
                            onChange={(e) => {
                                const date = parseISO(e.target.value);
                                setFilters({ ...filters, endDate: endOfDay(date) });
                            }}
                            disabled={disabled}
                            className="bg-background/50 border-primary/10 focus-visible:ring-primary h-10"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Hospital</Label>
                        <Select
                            value={filters.hospital}
                            onValueChange={(val) => setFilters({ ...filters, hospital: val })}
                            disabled={disabled || (filters.patientId !== 'all')}
                        >
                            <SelectTrigger className="bg-background/50 border-primary/10 focus:ring-primary h-10">
                                <SelectValue placeholder="All Hospitals" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Hospitals</SelectItem>
                                {ontarioHospitals.map((h) => (
                                    <SelectItem key={h.value} value={h.value}>{h.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Region</Label>
                        <Select
                            value={filters.region}
                            onValueChange={(val) => setFilters({ ...filters, region: val })}
                            disabled={disabled || (filters.patientId !== 'all')}
                        >
                            <SelectTrigger className="bg-background/50 border-primary/10 focus:ring-primary h-10">
                                <SelectValue placeholder="All Regions" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Regions</SelectItem>
                                {(regions.length ? regions : DEFAULT_REGIONS).map((r) => (
                                    <SelectItem key={r} value={r}>{getRegionDisplayLabel(r)}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
