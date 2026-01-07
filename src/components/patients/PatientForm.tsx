'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { createPatient, updatePatient } from '@/app/patients/actions';
import { patientSchema, Patient, REGIONS, CLINIC_TYPES, COMMUNICATION_METHODS, CONSENT_STATUSES, CASE_STATUSES } from '@/types/patient';

interface PatientFormProps {
    patient?: Patient;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function PatientForm({ patient, isOpen, onClose, onSuccess }: PatientFormProps) {
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

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
            preferredCommunication: 'email',
            consentStatus: 'not_obtained',
            caseStatus: 'active',
            needs: [],
            notes: '',
            ...patient,
            // Ensure dates are converted to Date objects if they are strings (though type says Date)
            dateOfBirth: patient?.dateOfBirth ? new Date(patient.dateOfBirth) : undefined,
            consentDate: patient?.consentDate ? new Date(patient.consentDate) : undefined,
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
                preferredCommunication: 'email',
                consentStatus: 'not_obtained',
                caseStatus: 'active',
                needs: [],
                notes: '',
                ...patient,
                dateOfBirth: patient?.dateOfBirth ? new Date(patient.dateOfBirth) : undefined,
                consentDate: patient?.consentDate ? new Date(patient.consentDate) : undefined,
            });
        }
    }, [isOpen, patient, form]);

    const onSubmit = async (data: Patient) => {
        setIsLoading(true);
        try {
            let result;
            if (patient?.id) {
                result = await updatePatient(patient.id, data);
            } else {
                result = await createPatient(data);
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

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
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
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                                        <FormControl>
                                            <Input {...field} placeholder="Hospital Name" />
                                        </FormControl>
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
                                        <FormLabel>Region *</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
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

                        <div className="space-y-4">
                            <h3 className="text-lg font-medium">Contact Information</h3>
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
                        </div>

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
                                                            {status === 'on_file' ? 'Yes: on file' : 'No: not obtained'}
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
                            </div>
                        </div>

                        <FormField
                            control={form.control}
                            name="notes"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Notes</FormLabel>
                                    <FormControl>
                                        <Textarea {...field} placeholder="General notes..." />
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
    );
}
