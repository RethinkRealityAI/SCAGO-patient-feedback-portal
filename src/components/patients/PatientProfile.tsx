'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import {
    User, Calendar, MapPin, Phone, Mail, FileText, Activity,
    AlertCircle, CheckCircle2, Clock, Edit, ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { PatientForm } from '@/components/patients/PatientForm';
import { PatientInteractions } from '@/components/patients/PatientInteractions';
import { PatientDocuments } from '@/components/patients/PatientDocuments';
import { getPatient, getPatientInteractions, getPatientDocuments } from '@/app/patients/actions';
import { Patient, PatientInteraction, PatientDocument } from '@/types/patient';
import { cn } from '@/lib/utils';

interface PatientProfileProps {
    patientId: string;
}

export function PatientProfile({ patientId }: PatientProfileProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [patient, setPatient] = useState<Patient | null>(null);
    const [interactions, setInteractions] = useState<PatientInteraction[]>([]);
    const [documents, setDocuments] = useState<PatientDocument[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditOpen, setIsEditOpen] = useState(false);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [patientRes, interactionsRes, documentsRes] = await Promise.all([
                getPatient(patientId),
                getPatientInteractions(patientId),
                getPatientDocuments(patientId)
            ]);

            if (patientRes.success && patientRes.data) {
                setPatient(patientRes.data);
            } else {
                toast({
                    title: 'Error',
                    description: 'Failed to load patient data',
                    variant: 'destructive',
                });
            }

            if (interactionsRes.success && interactionsRes.data) {
                setInteractions(interactionsRes.data);
            }

            if (documentsRes.success && documentsRes.data) {
                setDocuments(documentsRes.data);
            }
        } catch (error) {
            console.error('Error loading profile:', error);
            toast({
                title: 'Error',
                description: 'An unexpected error occurred',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [patientId]);

    if (isLoading) {
        return <div className="flex items-center justify-center h-screen">Loading...</div>;
    }

    if (!patient) {
        return <div className="flex items-center justify-center h-screen">Patient not found</div>;
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'bg-green-500';
            case 'inactive': return 'bg-gray-500';
            case 'closed': return 'bg-red-500';
            case 'deceased': return 'bg-black';
            default: return 'bg-gray-500';
        }
    };

    const getConsentBadge = (status: string) => {
        switch (status) {
            case 'on_file': return <Badge className="bg-green-600">Consent On File</Badge>;
            case 'not_obtained': return <Badge variant="destructive">No Consent</Badge>;
            case 'withdrawn': return <Badge variant="secondary">Consent Withdrawn</Badge>;
            case 'expired': return <Badge variant="outline" className="text-orange-500 border-orange-500">Consent Expired</Badge>;
            default: return null;
        }
    };

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">{patient.fullName}</h1>
                        <div className="flex items-center gap-2 text-muted-foreground mt-1">
                            <Badge variant="outline" className="capitalize">{patient.hospital}</Badge>
                            <span>•</span>
                            <span>MRN: {patient.mrn || 'N/A'}</span>
                            <span>•</span>
                            <span className="capitalize">{patient.region}</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className={`h-3 w-3 rounded-full ${getStatusColor(patient.caseStatus)}`} />
                    <span className="capitalize font-medium text-sm">{patient.caseStatus}</span>
                    <Button onClick={() => setIsEditOpen(true)} className="ml-4">
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Profile
                    </Button>
                </div>
            </div>

            {/* Alerts Section */}
            {patient.consentStatus === 'not_obtained' && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Action Required</AlertTitle>
                    <AlertDescription>
                        Patient consent has not been obtained. Please upload a consent form or update the status.
                    </AlertDescription>
                </Alert>
            )}

            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="interactions">Interactions ({interactions.length})</TabsTrigger>
                    <TabsTrigger value="documents">Documents ({documents.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Key Details Card */}
                        <Card className="md:col-span-2">
                            <CardHeader>
                                <CardTitle>Patient Details</CardTitle>
                            </CardHeader>
                            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <div className="text-sm font-medium text-muted-foreground">Date of Birth</div>
                                    <div className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4 text-muted-foreground" />
                                        {format(new Date(patient.dateOfBirth), 'MMMM d, yyyy')}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <div className="text-sm font-medium text-muted-foreground">Diagnosis</div>
                                    <div className="flex items-center gap-2">
                                        <Activity className="h-4 w-4 text-muted-foreground" />
                                        {patient.diagnosis}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <div className="text-sm font-medium text-muted-foreground">Contact</div>
                                    <div className="space-y-1">
                                        {patient.contactInfo.email && (
                                            <div className="flex items-center gap-2">
                                                <Mail className="h-4 w-4 text-muted-foreground" />
                                                <a href={`mailto:${patient.contactInfo.email}`} className="hover:underline">
                                                    {patient.contactInfo.email}
                                                </a>
                                            </div>
                                        )}
                                        {patient.contactInfo.phone && (
                                            <div className="flex items-center gap-2">
                                                <Phone className="h-4 w-4 text-muted-foreground" />
                                                <a href={`tel:${patient.contactInfo.phone}`} className="hover:underline">
                                                    {patient.contactInfo.phone}
                                                </a>
                                            </div>
                                        )}
                                        {patient.contactInfo.address && (
                                            <div className="flex items-center gap-2">
                                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                                {patient.contactInfo.address}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <div className="text-sm font-medium text-muted-foreground">Consent</div>
                                    <div className="flex items-center gap-2">
                                        {getConsentBadge(patient.consentStatus)}
                                        {patient.consentDate && (
                                            <span className="text-xs text-muted-foreground">
                                                ({format(new Date(patient.consentDate), 'MMM d, yyyy')})
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Quick Actions / Summary Card */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Quick Summary</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <div className="text-sm font-medium text-muted-foreground mb-1">Last Interaction</div>
                                    {interactions.length > 0 ? (
                                        <div className="text-sm">
                                            <div className="font-medium">{format(new Date(interactions[0].date), 'MMM d, yyyy')}</div>
                                            <div className="text-muted-foreground truncate">{interactions[0].notes}</div>
                                        </div>
                                    ) : (
                                        <div className="text-sm text-muted-foreground">No interactions recorded</div>
                                    )}
                                </div>
                                <Separator />
                                <div>
                                    <div className="text-sm font-medium text-muted-foreground mb-1">Identified Needs</div>
                                    <div className="flex flex-wrap gap-2">
                                        {patient.needs && patient.needs.length > 0 ? (
                                            patient.needs.map(need => (
                                                <Badge key={need} variant="secondary" className="capitalize">
                                                    {need.replace('_', ' ')}
                                                </Badge>
                                            ))
                                        ) : (
                                            <span className="text-sm text-muted-foreground">None listed</span>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Notes Card */}
                        <Card className="md:col-span-3">
                            <CardHeader>
                                <CardTitle>General Notes</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm whitespace-pre-wrap">
                                    {patient.notes || 'No general notes available.'}
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="interactions" className="h-[600px]">
                    <PatientInteractions
                        patientId={patientId}
                        interactions={interactions}
                        onUpdate={loadData}
                    />
                </TabsContent>

                <TabsContent value="documents" className="h-[600px]">
                    <PatientDocuments
                        patientId={patientId}
                        documents={documents}
                        onUpdate={loadData}
                    />
                </TabsContent>
            </Tabs>

            <PatientForm
                patient={patient}
                isOpen={isEditOpen}
                onClose={() => setIsEditOpen(false)}
                onSuccess={loadData}
            />
        </div>
    );
}
