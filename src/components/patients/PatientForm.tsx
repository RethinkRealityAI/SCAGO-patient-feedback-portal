'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { createPatient, updatePatient, checkRegionChangeWarning } from '@/app/patients/actions';
import { patientSchema, Patient, DEFAULT_REGIONS, CLINIC_TYPES, COMMUNICATION_METHODS, CONSENT_STATUSES, CASE_STATUSES, FREQUENCIES, getRegionDisplayLabel } from '@/types/patient';
import { getRegions } from '@/app/admin/user-actions';
import { ontarioHospitals } from '@/lib/hospital-names';
import { NeedsSelector } from '@/components/patients/NeedsSelector';
import { EmergencyContactsForm } from '@/components/patients/EmergencyContactsForm';

interface PatientFormProps {
    patient?: Patient;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function PatientForm({ patient, isOpen, onClose, onSuccess }: PatientFormProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [showRegionWarning, setShowRegionWarning] = useState(false);
    const [pendingRegionValue, setPendingRegionValue] = useState<string | null>(null);
    const [regions, setRegions] = useState<string[]>([]);
    const { toast } = useToast();

    useEffect(() => {
        getRegions().then(setRegions);
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

            ...patient,
            // Ensure dates are converted to Date objects if they are strings (though type says Date)
            dateOfBirth: patient?.dateOfBirth ? new Date(patient.dateOfBirth) : undefined,
            consentDate: patient?.consentDate ? new Date(patient.consentDate) : undefined,
            referral: patient?.referral ? {
                ...patient.referral,
                date: patient.referral.date ? new Date(patient.referral.date) : undefined
            } : {
                name: '',
                role: '',
                hospital: '',
                notes: '',
            }
        },
    });

    useEffect(() => {
        if (isOpen) {
            form.reset({
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

                ...patient,
                dateOfBirth: patient?.dateOfBirth ? new Date(patient.dateOfBirth) : undefined,
                consentDate: patient?.consentDate ? new Date(patient.consentDate) : undefined,
                referral: patient?.referral ? {
                    ...patient.referral,
                    date: patient.referral.date ? new Date(patient.referral.date) : undefined
                } : {
                    name: '',
                    role: '',
                    hospital: '',
                    notes: '',
                }
            });
        }
    }, [isOpen, patient, form]);

    const onSubmit = async (data: Patient) => {
        setIsLoading(true);
        try {
            // Sanitize guardian data if adult
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

            let result;
            if (patient?.id) {
                result = await updatePatient(patient.id, submissionData);
            } else {
                result = await createPatient(submissionData);
            }

            if (result.success) {
                toast({
                    title: patient ? 'Patient Updated' : 'Patient Created',
                    description: patient
                        ? 'Patient information has been updated successfully.'
                        : 'New patient has been added to the system.',
                });
                onSuccess();
                onClose();
            } else {
                toast({
                    title: 'Error',
                    description: result.error || 'Failed to save patient',
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

    const isAdult = form.watch('guardianContact.isAdult');

    return (
        <>
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {patient ? 'Edit Patient' : 'Add New Patient'}
                    </DialogTitle>
                    <DialogDescription>
                        {patient
                            ? 'Update patient details.'
                            : 'Enter the details for the new patient.'
                        }
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                        {/* Basic Information */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium">Basic Information</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                    render={({ field }) => {
                                        const handleRegionChange = async (newValue: string) => {
                                            if (newValue === field.value) return;
                                            if (patient) {
                                                const { wouldLoseAccess } = await checkRegionChangeWarning(newValue);
                                                if (wouldLoseAccess) {
                                                    setPendingRegionValue(newValue);
                                                    setShowRegionWarning(true);
                                                    return;
                                                }
                                            }
                                            field.onChange(newValue);
                                        };
                                        return (
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
                                                <Select onValueChange={handleRegionChange} value={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select region" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {(regions.length ? regions : DEFAULT_REGIONS).map((region) => (
                                                            <SelectItem key={region} value={region}>
                                                                {getRegionDisplayLabel(region)}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        );
                                    }}
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
                            <div className="flex items-center justify-between">
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

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                    name="contactInfo.address"
                                    render={({ field }) => (
                                        <FormItem className="md:col-span-2">
                                            <FormLabel>Address</FormLabel>
                                            <FormControl>
                                                <Input {...field} placeholder="Full address" />
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
                            <h3 className="text-lg font-medium">Health & Needs</h3>
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
                            <h3 className="text-lg font-medium">Consent & Referral</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                        <FormItem className="md:col-span-2">
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

                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={onClose}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? 'Saving...' : 'Save Patient'}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>

        <AlertDialog open={showRegionWarning} onOpenChange={(open) => !open && (setShowRegionWarning(false), setPendingRegionValue(null))}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Region change may affect your access</AlertDialogTitle>
                    <AlertDialogDescription>
                        Changing this patient&apos;s region to {pendingRegionValue} may mean you will no longer be able to see them, if you are not assigned to that region. Do you want to continue?
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={() => {
                            if (pendingRegionValue) {
                                form.setValue('region', pendingRegionValue as Patient['region']);
                            }
                            setShowRegionWarning(false);
                            setPendingRegionValue(null);
                        }}
                    >
                        Continue
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
        </>
    );
}
