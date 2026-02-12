'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { ArrowLeft, UserPlus, Loader2, Save, ClipboardList, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { createPatient, getConsentCandidates, createPatientFromCandidate, type ConsentCandidate } from '@/app/patients/actions';
import {
    patientSchema,
    Patient,
    REGIONS,
    CLINIC_TYPES,
    COMMUNICATION_METHODS,
    CONSENT_STATUSES,
    CASE_STATUSES,
    FREQUENCIES
} from '@/types/patient';
import { ontarioHospitals } from '@/lib/hospital-names';
import { NeedsSelector } from '@/components/patients/NeedsSelector';
import { EmergencyContactsForm } from '@/components/patients/EmergencyContactsForm';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function NewPatientPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [candidates, setCandidates] = useState<ConsentCandidate[]>([]);
    const [candidatesLoading, setCandidatesLoading] = useState(true);
    const [selectedCandidate, setSelectedCandidate] = useState<ConsentCandidate | null>(null);
    const [intakeOpen, setIntakeOpen] = useState(true);

    useEffect(() => {
        let cancelled = false;
        setCandidatesLoading(true);
        getConsentCandidates().then((res) => {
            if (!cancelled && res.success && res.data) setCandidates(res.data);
        }).finally(() => { if (!cancelled) setCandidatesLoading(false); });
        return () => { cancelled = true; };
    }, []);

    const form = useForm<Patient>({
        resolver: zodResolver(patientSchema),
        defaultValues: {
            fullName: '',
            hospital: '',
            region: 'GTA',
            diagnosis: '',
            contactInfo: {
                email: '',
                phone: '',
                address: '',
            },
            guardianContact: {
                name: '',
                relation: '',
                contactInfo: {
                    email: '',
                    phone: '',
                },
                isAdult: true,
            },
            emergencyContacts: [],
            preferredCommunication: 'email',
            consentStatus: 'not_obtained',
            caseStatus: 'active',
            needs: [],
            painCrisisFrequency: '',
            erUsageFrequency: '',
            notes: '',
            referral: {
                name: '',
                role: '',
                hospital: '',
                notes: '',
            }
        },
    });

    const onSubmit = async (data: Patient) => {
        setIsLoading(true);
        try {
            const submissionData = { ...data };
            if (submissionData.guardianContact?.isAdult) {
                submissionData.guardianContact = {
                    ...submissionData.guardianContact,
                    name: undefined,
                    relation: undefined,
                    contactInfo: {
                        email: undefined,
                        phone: undefined,
                    }
                };
            }

            const result = selectedCandidate
                ? await createPatientFromCandidate(selectedCandidate, submissionData)
                : await createPatient(submissionData);

            if (result.success) {
                if (selectedCandidate) {
                    setCandidates((prev) => prev.filter((c) => c.candidateKey !== selectedCandidate.candidateKey));
                    setSelectedCandidate(null);
                }
                toast({
                    title: 'Patient Created',
                    description: 'New patient has been added to the system.',
                });
                router.push(`/patients/${result.id}`);
            } else {
                toast({
                    title: 'Error',
                    description: result.error || 'Failed to create patient',
                    variant: 'destructive',
                });
            }
        } catch (error) {
            console.error('Error submitting form:', error);
            toast({
                title: 'Error',
                description: 'An unexpected error occurred',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectCandidate = (c: ConsentCandidate) => {
        setSelectedCandidate(c);
        // Consent candidates do not currently carry DOB; set a safe fallback so
        // required schema validation does not block conversion.
        const fallbackDob = new Date('2000-01-01');
        form.reset({
            fullName: c.fullName,
            dateOfBirth: fallbackDob,
            hospital: c.primaryHospital || '',
            region: c.region,
            diagnosis: 'Sickle Cell Disease',
            contactInfo: { email: c.email, phone: c.phone, address: '' },
            preferredCommunication: 'email',
            consentStatus: 'on_file',
            consentDate: c.signatureDate ? new Date(c.signatureDate) : new Date(),
            caseStatus: 'active',
            guardianContact: { name: '', relation: '', contactInfo: { email: '', phone: '' }, isAdult: true },
            emergencyContacts: [],
            needs: [],
            painCrisisFrequency: '',
            erUsageFrequency: '',
            notes: '',
            referral: { name: '', role: '', hospital: '', notes: '' },
        });
    };

    const isAdult = form.watch('guardianContact.isAdult');

    return (
        <div className="container mx-auto py-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.push('/patients')}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                            <UserPlus className="h-8 w-8" />
                            Add New Patient
                        </h1>
                        <p className="text-muted-foreground">
                            Enter the patient information to add them to the system.
                        </p>
                    </div>
                </div>
            </div>

            {/* Create from Intake */}
            <Collapsible open={intakeOpen} onOpenChange={setIntakeOpen}>
                <Card>
                    <CollapsibleTrigger asChild>
                        <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <ClipboardList className="h-5 w-5" />
                                    <CardTitle className="text-lg">Create from Intake / Consent</CardTitle>
                                    {candidates.length > 0 && (
                                        <span className="text-sm font-normal text-muted-foreground">({candidates.length} available)</span>
                                    )}
                                </div>
                                {intakeOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </div>
                            <CardDescription>
                                Select someone who has filled out the consent form to prefill and create a patient profile. Their consent form will be attached automatically.
                            </CardDescription>
                        </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                        <CardContent className="pt-0">
                            {candidatesLoading ? (
                                <div className="flex items-center gap-2 py-4 text-muted-foreground">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Loading consent submissions...
                                </div>
                            ) : candidates.length === 0 ? (
                                <p className="py-4 text-sm text-muted-foreground">No consent submissions available to convert. Add patient manually below.</p>
                            ) : (
                                <div className="space-y-2 max-h-60 overflow-y-auto">
                                    {candidates.map((c) => (
                                        <button
                                            key={c.submissionId}
                                            type="button"
                                            onClick={() => handleSelectCandidate(c)}
                                            className={`w-full flex items-center justify-between p-3 rounded-lg border text-left transition-colors ${
                                                selectedCandidate?.candidateKey === c.candidateKey
                                                    ? 'border-primary bg-primary/5'
                                                    : 'hover:bg-muted/50 border-border'
                                            }`}
                                        >
                                            <div>
                                                <p className="font-medium">{c.fullName}</p>
                                                <p className="text-sm text-muted-foreground">{c.email || c.phone || 'No contact'} · {c.city || 'No city'} · {c.region}</p>
                                            </div>
                                            {selectedCandidate?.candidateKey === c.candidateKey && (
                                                <span className="text-xs font-medium text-primary">Selected</span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                            {selectedCandidate && (
                                <div className="mt-3 flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 p-3">
                                    <div className="space-y-1">
                                        <p className="text-sm">Creating from: <strong>{selectedCandidate.fullName}</strong></p>
                                        <p className="text-xs text-muted-foreground">
                                            Date of birth was prefilled with a default value. Please confirm and update it before saving.
                                        </p>
                                    </div>
                                    <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedCandidate(null)}>
                                        Clear selection
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </CollapsibleContent>
                </Card>
            </Collapsible>

            {/* Form */}
            <Card>
                <CardHeader>
                    <CardTitle>Patient Information</CardTitle>
                    <CardDescription>
                        Fill in the patient details below. Required fields are marked with an asterisk (*).
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                            {/* Basic Information */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-medium border-b pb-2">Basic Information</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="fullName"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Full Name *</FormLabel>
                                                <FormControl>
                                                    <Input {...field} placeholder="John Doe" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="dateOfBirth"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Date of Birth *</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="date"
                                                        value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''}
                                                        onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="hospital"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Hospital *</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select hospital" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent className="max-h-[300px]">
                                                        {ontarioHospitals.map((h) => (
                                                            <SelectItem key={h.value} value={h.label}>
                                                                {h.label}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="mrn"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>MRN</FormLabel>
                                                <FormControl>
                                                    <Input {...field} placeholder="Medical Record Number" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="region"
                                        render={({ field }) => (
                                            <FormItem>
                                                <div className="flex items-center gap-2">
                                                    <FormLabel>Region *</FormLabel>
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                                                            </TooltipTrigger>
                                                            <TooltipContent side="right" className="max-w-xs">
                                                                <p className="text-xs">Region controls which admins can see this patient. Admins are assigned regions and only see patients in those regions.</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                </div>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select region" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {REGIONS.map((region) => (
                                                            <SelectItem key={region} value={region}>
                                                                {region}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="clinicType"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Clinic Type</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select type" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {CLINIC_TYPES.map((type) => (
                                                            <SelectItem key={type} value={type}>
                                                                {type.charAt(0).toUpperCase() + type.slice(1)}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="diagnosis"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Diagnosis *</FormLabel>
                                                <FormControl>
                                                    <Input {...field} placeholder="e.g. SS, SC" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="caseStatus"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Case Status</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select status" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {CASE_STATUSES.map((status) => (
                                                            <SelectItem key={status} value={status}>
                                                                {status.charAt(0).toUpperCase() + status.slice(1)}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>

                            {/* Contact Information */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between border-b pb-2">
                                    <h3 className="text-lg font-medium">Contact Information</h3>
                                    <FormField
                                        control={form.control}
                                        name="guardianContact.isAdult"
                                        render={({ field }) => (
                                            <FormItem className="flex items-center space-x-2">
                                                <FormLabel className="!mt-0">Adult Patient?</FormLabel>
                                                <FormControl>
                                                    <Switch
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="contactInfo.email"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Email</FormLabel>
                                                <FormControl>
                                                    <Input type="email" {...field} placeholder="email@example.com" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="contactInfo.phone"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Phone</FormLabel>
                                                <FormControl>
                                                    <Input type="tel" {...field} placeholder="(555) 123-4567" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="preferredCommunication"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Preferred Communication</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select method" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {COMMUNICATION_METHODS.map((method) => (
                                                            <SelectItem key={method} value={method}>
                                                                {method.charAt(0).toUpperCase() + method.slice(1)}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="contactInfo.address"
                                        render={({ field }) => (
                                            <FormItem className="lg:col-span-3">
                                                <FormLabel>Address</FormLabel>
                                                <FormControl>
                                                    <Input {...field} placeholder="Full address" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                {/* Guardian Contact (if not adult) */}
                                {!isAdult && (
                                    <div className="p-4 border rounded-lg bg-muted/20 space-y-4">
                                        <h4 className="font-medium text-sm">Parent/Guardian Contact</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <FormField
                                                control={form.control}
                                                name="guardianContact.name"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Guardian Name</FormLabel>
                                                        <FormControl>
                                                            <Input {...field} placeholder="Guardian Name" />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="guardianContact.relation"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Relationship</FormLabel>
                                                        <FormControl>
                                                            <Input {...field} placeholder="e.g. Mother, Father" />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="guardianContact.contactInfo.phone"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Guardian Phone</FormLabel>
                                                        <FormControl>
                                                            <Input {...field} placeholder="Phone Number" />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="guardianContact.contactInfo.email"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Guardian Email</FormLabel>
                                                        <FormControl>
                                                            <Input {...field} placeholder="Email Address" />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Emergency Contacts */}
                                <div className="space-y-4">
                                    <FormField
                                        control={form.control}
                                        name="emergencyContacts"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <EmergencyContactsForm
                                                        contacts={field.value || []}
                                                        onChange={field.onChange}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>

                            {/* Health & Needs */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-medium border-b pb-2">Health & Needs</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="painCrisisFrequency"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Pain Crisis Frequency</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select frequency" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {FREQUENCIES.map((freq) => (
                                                            <SelectItem key={freq} value={freq}>
                                                                {freq.charAt(0).toUpperCase() + freq.slice(1)}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="erUsageFrequency"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>ER Usage Frequency</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select frequency" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {FREQUENCIES.map((freq) => (
                                                            <SelectItem key={freq} value={freq}>
                                                                {freq.charAt(0).toUpperCase() + freq.slice(1)}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <FormField
                                    control={form.control}
                                    name="needs"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                <NeedsSelector
                                                    selectedNeeds={field.value || []}
                                                    onChange={field.onChange}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* Consent & Referral */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-medium border-b pb-2">Consent & Referral</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="consentStatus"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Consent Status</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select status" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {CONSENT_STATUSES.map((status) => (
                                                            <SelectItem key={status} value={status}>
                                                                {status.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="consentDate"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Consent Date</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="date"
                                                        value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''}
                                                        onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="referral.name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Referred By (Name)</FormLabel>
                                                <FormControl>
                                                    <Input {...field} placeholder="Name" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="referral.role"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Referred By (Role)</FormLabel>
                                                <FormControl>
                                                    <Input {...field} placeholder="Role" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="referral.hospital"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Referred By (Hospital)</FormLabel>
                                                <FormControl>
                                                    <Input {...field} placeholder="Referring Hospital" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="referral.date"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Referral Date</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="date"
                                                        value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''}
                                                        onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="referral.notes"
                                        render={({ field }) => (
                                            <FormItem className="lg:col-span-3">
                                                <FormLabel>Referral Notes</FormLabel>
                                                <FormControl>
                                                    <Textarea {...field} placeholder="Additional referral details..." />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>

                            {/* General Notes */}
                            <FormField
                                control={form.control}
                                name="notes"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>General Notes</FormLabel>
                                        <FormControl>
                                            <Textarea {...field} placeholder="General notes..." className="min-h-[100px]" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Submit Buttons */}
                            <div className="flex justify-end gap-4 pt-4 border-t">
                                <Button type="button" variant="outline" onClick={() => router.push('/patients')}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={isLoading}>
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="mr-2 h-4 w-4" />
                                            Create Patient
                                        </>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}
