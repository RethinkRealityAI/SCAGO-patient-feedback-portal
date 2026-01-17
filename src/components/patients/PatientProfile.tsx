'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format, differenceInDays } from 'date-fns';
import {
    User, Calendar, MapPin, Phone, Mail, FileText, Activity,
    AlertCircle, CheckCircle2, Clock, Edit, ArrowLeft, HeartPulse, Building2
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
        return (
            <div className="space-y-6 p-6">
                {/* Loading skeleton */}
                <div className="flex items-center gap-4">
                    <div className="h-10 w-10 bg-muted rounded animate-pulse" />
                    <div className="space-y-2">
                        <div className="h-8 w-64 bg-muted rounded animate-pulse" />
                        <div className="h-4 w-48 bg-muted rounded animate-pulse" />
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2 h-64 bg-muted rounded-lg animate-pulse" />
                    <div className="h-64 bg-muted rounded-lg animate-pulse" />
                </div>
            </div>
        );
    }

    if (!patient) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
                <AlertCircle className="h-16 w-16 text-muted-foreground" />
                <h2 className="text-2xl font-bold">Patient Not Found</h2>
                <p className="text-muted-foreground">
                    The patient record you're looking for doesn't exist or may have been deleted.
                </p>
                <Button onClick={() => router.push('/patients')} variant="outline">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Patient List
                </Button>
            </div>
        );
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

    const getLastInteractionAlert = () => {
        if (!interactions.length) return null;
        const lastDate = new Date(interactions[0].date);
        const daysSince = differenceInDays(new Date(), lastDate);

        if (daysSince > 30) {
            return (
                <Alert variant="destructive">
                    <Clock className="h-4 w-4" />
                    <AlertTitle>Follow-up Overdue</AlertTitle>
                    <AlertDescription>
                        Last interaction was {daysSince} days ago. Patient interaction is overdue.
                    </AlertDescription>
                </Alert>
            );
        }
        return null;
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
                        <div className="flex items-center gap-2 text-muted-foreground mt-1 text-sm flex-wrap">
                            <Badge variant="outline" className="capitalize">{patient.hospital}</Badge>
                            <span>•</span>
                            <span>MRN: {patient.mrn || 'N/A'}</span>
                            <span>•</span>
                            <span className="capitalize">{patient.region}</span>
                            {patient.referral?.name && (
                                <>
                                    <span>•</span>
                                    <span>Referred by: {patient.referral.name}</span>
                                </>
                            )}
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
            <div className="space-y-2">
                {patient.consentStatus === 'not_obtained' && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Action Required</AlertTitle>
                        <AlertDescription>
                            Patient consent has not been obtained. Please upload a consent form or update the status.
                        </AlertDescription>
                    </Alert>
                )}
                {getLastInteractionAlert()}
            </div>

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

                                {patient.referral && (
                                    <div className="space-y-1 md:col-span-2">
                                        <div className="text-sm font-medium text-muted-foreground">Referral Details</div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                            {patient.referral.name && <div><span className="text-muted-foreground">By:</span> {patient.referral.name}</div>}
                                            {patient.referral.hospital && <div><span className="text-muted-foreground">From:</span> {patient.referral.hospital}</div>}
                                            {patient.referral.date && <div><span className="text-muted-foreground">Date:</span> {format(new Date(patient.referral.date), 'MMM d, yyyy')}</div>}
                                            {patient.referral.notes && <div className="md:col-span-2"><span className="text-muted-foreground">Notes:</span> {patient.referral.notes}</div>}
                                        </div>
                                    </div>
                                )}
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
                                    <div className="text-sm font-medium text-muted-foreground mb-1">Health Metrics</div>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span>Pain Crisis:</span>
                                            <span className="font-medium capitalize">{patient.painCrisisFrequency || 'N/A'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>ER Usage:</span>
                                            <span className="font-medium capitalize">{patient.erUsageFrequency || 'N/A'}</span>
                                        </div>
                                    </div>
                                </div>
                                <Separator />
                                <div>
                                    <div className="text-sm font-medium text-muted-foreground mb-1">Identified Needs</div>
                                    <div className="flex flex-wrap gap-2">
                                        {patient.needs && patient.needs.length > 0 ? (
                                            patient.needs.map(need => (
                                                <Badge key={need} variant="secondary" className="capitalize">
                                                    {need.replace(/_/g, ' ')}
                                                </Badge>
                                            ))
                                        ) : (
                                            <span className="text-sm text-muted-foreground">None listed</span>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Emergency Contacts Card */}
                        {patient.emergencyContacts && patient.emergencyContacts.length > 0 && (
                            <Card className="md:col-span-1">
                                <CardHeader>
                                    <CardTitle>Emergency Contacts</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {patient.emergencyContacts.map((contact, idx) => (
                                        <div key={idx} className="text-sm">
                                            <div className="font-medium flex items-center gap-2">
                                                {contact.name}
                                                {contact.isPrimary && <Badge variant="outline" className="text-xs py-0 h-4">Primary</Badge>}
                                            </div>
                                            <div className="text-muted-foreground">{contact.relationship}</div>
                                            <div>{contact.phone}</div>
                                            {idx < patient.emergencyContacts!.length - 1 && <Separator className="my-2" />}
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        )}

                        {/* Guardian Info (if child) */}
                        {patient.guardianContact && !patient.guardianContact.isAdult && (
                            <Card className="md:col-span-1">
                                <CardHeader>
                                    <CardTitle>Guardian Information</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2 text-sm">
                                    <div className="font-medium">{patient.guardianContact.name}</div>
                                    <div className="text-muted-foreground">{patient.guardianContact.relation}</div>
                                    {patient.guardianContact.contactInfo?.phone && (
                                        <div className="flex items-center gap-2">
                                            <Phone className="h-3 w-3" /> {patient.guardianContact.contactInfo.phone}
                                        </div>
                                    )}
                                    {patient.guardianContact.contactInfo?.email && (
                                        <div className="flex items-center gap-2">
                                            <Mail className="h-3 w-3" /> {patient.guardianContact.contactInfo.email}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}

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
