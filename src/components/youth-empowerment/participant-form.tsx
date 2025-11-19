'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Upload, FileText, Eye, Download, X, Edit2, Save, File, Image, FileCode } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { createParticipant, updateParticipant, getMentors } from '@/app/youth-empowerment/actions';
import { getMentorByNameOrId } from '@/app/youth-empowerment/relationship-actions';
import { regionOptions, canadianStatusOptions, validateSINLenient, looksLikeFirestoreId } from '@/lib/youth-empowerment';
import { SINSecureField } from '@/components/yep-forms/sin-secure-field';
import { SelectWithOther } from '@/components/ui/select-with-other';
import { AvailabilitySelector } from '@/components/youth-empowerment/availability-selector';
import { YEPParticipant, YEPMentor } from '@/lib/youth-empowerment';

const participantFormSchema = z.object({
  youthParticipant: z.string().min(2, 'Name is required'),
  age: z.number().max(30).optional(),
  email: z.string().email('Valid email is required').optional().or(z.literal('')),
  etransferEmailAddress: z.string().email('Valid email is required').optional().or(z.literal('')),
  phoneNumber: z.string().optional().or(z.literal('')),
  emergencyContactRelationship: z.string().optional().or(z.literal('')),
  emergencyContactNumber: z.string().optional().or(z.literal('')),
  region: z.string().optional().or(z.literal('')),
  mailingAddress: z.string().optional().or(z.literal('')),
  // Separate address fields
  streetAddress: z.string().optional().or(z.literal('')),
  city: z.string().optional().or(z.literal('')),
  province: z.string().optional().or(z.literal('')),
  postalCode: z.string().optional().or(z.literal('')),
  projectCategory: z.string().optional().or(z.literal('')),
  projectInANutshell: z.string().optional().or(z.literal('')),
  contractSigned: z.boolean().optional().default(false),
  signedSyllabus: z.boolean().optional().default(false),
  availability: z.string().optional().or(z.literal('')),
  assignedMentor: z.string().optional().or(z.literal('')),
  idProvided: z.boolean().optional().default(false),
  canadianStatus: z.enum(['Canadian Citizen', 'Permanent Resident', 'Other']).optional().default('Other'),
  sin: z.string().optional().refine((val) => {
    // Only validate if the value exists and is not empty
    if (!val || val.trim() === '') return true;
    return validateSINLenient(val);
  }, 'Invalid SIN format').or(z.literal('')),
  sinNumber: z.string().optional().or(z.literal('')),
  youthProposal: z.string().optional().or(z.literal('')),
  affiliationWithSCD: z.string().optional().or(z.literal('')),
  proofOfAffiliationWithSCD: z.boolean().optional().default(false),
  scagoCounterpart: z.string().optional().or(z.literal('')),
  dob: z.string().optional().or(z.literal('')),
  // Additional legacy fields
  approved: z.boolean().optional().default(false),
  canadianStatusOther: z.string().optional().or(z.literal('')),
  citizenshipStatus: z.string().optional().or(z.literal('')),
  location: z.string().optional().or(z.literal('')),
  duties: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
  nextSteps: z.string().optional().or(z.literal('')),
  interviewed: z.boolean().optional(),
  interviewNotes: z.string().optional().or(z.literal('')),
  recruited: z.boolean().optional(),
}).superRefine((data, ctx) => {
  if (data.canadianStatus === 'Other' && (!data.canadianStatusOther || data.canadianStatusOther.trim() === '')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Please specify your status when "Other" is selected',
      path: ['canadianStatusOther'],
    });
  }
});

type ParticipantFormData = z.infer<typeof participantFormSchema>;

interface ParticipantFormProps {
  participant?: YEPParticipant;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// Helper function to calculate age from date of birth
function calculateAge(dob: string): number | undefined {
  if (!dob) return undefined;
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

// Helper to get file icon based on type
function getFileIcon(fileName: string) {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) {
    return <Image className="h-4 w-4" />;
  }
  if (['pdf'].includes(ext || '')) {
    return <FileText className="h-4 w-4" />;
  }
  if (['doc', 'docx'].includes(ext || '')) {
    return <FileCode className="h-4 w-4" />;
  }
  return <File className="h-4 w-4" />;
}

export function ParticipantForm({ participant, isOpen, onClose, onSuccess }: ParticipantFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [mentors, setMentors] = useState<YEPMentor[]>([]);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [existingFileUrl, setExistingFileUrl] = useState<string | null>(null);
  const [existingFileName, setExistingFileName] = useState<string | null>(null);
  const [isEditingFileName, setIsEditingFileName] = useState(false);
  const [customFileName, setCustomFileName] = useState('');
  const { toast } = useToast();

  const form = useForm<ParticipantFormData>({
    resolver: zodResolver(participantFormSchema),
    mode: 'onSubmit',
    defaultValues: {
      youthParticipant: participant?.youthParticipant || '',
      email: participant?.email || '',
      etransferEmailAddress: participant?.etransferEmailAddress || '',
      mailingAddress: participant?.mailingAddress || '',
      phoneNumber: participant?.phoneNumber || '',
      region: participant?.region || '',
      streetAddress: participant?.streetAddress || '',
      city: participant?.city || '',
      province: participant?.province || '',
      postalCode: participant?.postalCode || '',
      approved: participant?.approved || false,
      contractSigned: participant?.contractSigned || false,
      signedSyllabus: participant?.signedSyllabus || false,
      availability: participant?.availability || '',
      assignedMentor: participant?.assignedMentor || '',
      idProvided: participant?.idProvided || false,
      canadianStatus: participant?.canadianStatus || 'Canadian Citizen',
      canadianStatusOther: participant?.canadianStatusOther || '',
      sin: '',
      youthProposal: participant?.youthProposal || '',
      proofOfAffiliationWithSCD: participant?.proofOfAffiliationWithSCD || false,
      scagoCounterpart: participant?.scagoCounterpart || '',
      dob: participant?.dob || '',
      age: participant?.age || undefined,
      citizenshipStatus: participant?.citizenshipStatus || '',
      location: participant?.location || '',
      projectCategory: participant?.projectCategory || '',
      duties: participant?.duties || '',
      affiliationWithSCD: participant?.affiliationWithSCD || '',
      notes: participant?.notes || '',
      nextSteps: participant?.nextSteps || '',
      interviewed: participant?.interviewed || false,
      interviewNotes: participant?.interviewNotes || '',
      recruited: participant?.recruited || false,
    },
  });

  useEffect(() => {
    if (isOpen) {
      loadMentors();
      if (participant?.fileUrl) {
        setExistingFileUrl(participant.fileUrl);
        setExistingFileName(participant.fileName || 'Uploaded Document');
        setCustomFileName(participant.fileName || 'Uploaded Document');
      } else {
        setExistingFileUrl(null);
        setExistingFileName(null);
        setCustomFileName('');
      }
    }
  }, [isOpen, participant]);

  useEffect(() => {
    const resolveMentorName = async (assignedMentor: string | undefined) => {
      if (!assignedMentor) return '';

      if (assignedMentor && looksLikeFirestoreId(assignedMentor)) {
        const result = await getMentorByNameOrId(assignedMentor);
        if (result.success && result.mentor) {
          return result.mentor.name;
        }
      }

      return assignedMentor;
    };

    const initializeForm = async () => {
      if (participant) {
        const mentorName = await resolveMentorName(participant.assignedMentor);

        form.reset({
          youthParticipant: participant.youthParticipant || '',
          email: participant.email || '',
          etransferEmailAddress: participant.etransferEmailAddress || '',
          mailingAddress: participant.mailingAddress || '',
          phoneNumber: participant.phoneNumber || '',
          region: participant.region || '',
          streetAddress: participant.streetAddress || '',
          city: participant.city || '',
          province: participant.province || '',
          postalCode: participant.postalCode || '',
          approved: participant.approved || false,
          contractSigned: participant.contractSigned || false,
          signedSyllabus: participant.signedSyllabus || false,
          availability: participant.availability || '',
          assignedMentor: mentorName,
          idProvided: participant.idProvided || false,
          canadianStatus: participant.canadianStatus || 'Canadian Citizen',
          canadianStatusOther: participant.canadianStatusOther || '',
          sin: '',
          youthProposal: participant.youthProposal || '',
          proofOfAffiliationWithSCD: participant.proofOfAffiliationWithSCD || false,
          scagoCounterpart: participant.scagoCounterpart || '',
          dob: participant.dob || '',
          age: participant.age || undefined,
          citizenshipStatus: participant.citizenshipStatus || '',
          location: participant.location || '',
          projectCategory: participant.projectCategory || '',
          duties: participant.duties || '',
          affiliationWithSCD: participant.affiliationWithSCD || '',
          notes: participant.notes || '',
          nextSteps: participant.nextSteps || '',
          interviewed: participant.interviewed || false,
          interviewNotes: participant.interviewNotes || '',
          recruited: participant.recruited || false,
        });
        form.setValue('sin', '');
        form.clearErrors('sin');
        setUploadedFile(null);
        setExistingFileUrl(participant.fileUrl || null);
        setExistingFileName(participant.fileName || null);
        setCustomFileName(participant.fileName || '');
      } else {
        form.reset({
          youthParticipant: '',
          email: '',
          etransferEmailAddress: '',
          mailingAddress: '',
          phoneNumber: '',
          region: '',
          streetAddress: '',
          city: '',
          province: '',
          postalCode: '',
          approved: false,
          contractSigned: false,
          signedSyllabus: false,
          availability: '',
          assignedMentor: '',
          idProvided: false,
          canadianStatus: 'Canadian Citizen',
          canadianStatusOther: '',
          sin: '',
          youthProposal: '',
          proofOfAffiliationWithSCD: false,
          scagoCounterpart: '',
          dob: '',
          age: undefined,
          citizenshipStatus: '',
          location: '',
          projectCategory: '',
          duties: '',
          affiliationWithSCD: '',
          notes: '',
          nextSteps: '',
          interviewed: false,
          interviewNotes: '',
          recruited: false,
        });
        setUploadedFile(null);
        setExistingFileUrl(null);
        setExistingFileName(null);
        setCustomFileName('');
        form.clearErrors('sin');
      }
    };

    initializeForm();
  }, [participant?.id, form]);

  const loadMentors = async () => {
    try {
      const mentorsData = await getMentors();
      setMentors(mentorsData);
    } catch (error) {
      console.error('Error loading mentors:', error);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: 'File Too Large',
          description: 'Maximum file size is 10MB',
          variant: 'destructive',
        });
        event.target.value = '';
        return;
      }
      setUploadedFile(file);
      setExistingFileUrl(null);
      setCustomFileName(file.name);
    }
  };

  const handleFileView = () => {
    if (existingFileUrl) {
      window.open(existingFileUrl, '_blank');
    }
  };

  const handleFileRemove = () => {
    setUploadedFile(null);
    setExistingFileUrl(null);
    setExistingFileName(null);
    setCustomFileName('');
    // Reset the file input
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const handleFileNameSave = () => {
    if (customFileName.trim()) {
      setExistingFileName(customFileName);
      setIsEditingFileName(false);
      toast({
        title: 'Filename Updated',
        description: 'The filename will be saved when you submit the form.',
      });
    }
  };

  // Watch DOB and auto-calculate age
  const watchDOB = form.watch('dob');
  useEffect(() => {
    if (watchDOB) {
      const calculatedAge = calculateAge(watchDOB);
      if (calculatedAge !== undefined && calculatedAge !== form.getValues('age')) {
        form.setValue('age', calculatedAge);
      }
    }
  }, [watchDOB, form]);

  const onSubmit = async (data: ParticipantFormData) => {
    setIsLoading(true);
    try {
      let mentorName = data.assignedMentor || '';
      if (mentorName && looksLikeFirestoreId(mentorName)) {
        const mentorResult = await getMentorByNameOrId(mentorName);
        if (mentorResult.success && mentorResult.mentor) {
          mentorName = mentorResult.mentor.name;
        } else {
          toast({
            title: 'Warning',
            description: 'Assigned mentor not found. Assignment cleared.',
            variant: 'destructive',
          });
          mentorName = '';
        }
      } else if (mentorName) {
        const mentorResult = await getMentorByNameOrId(mentorName);
        if (!mentorResult.success) {
          toast({
            title: 'Warning',
            description: 'Assigned mentor not found. Please select a valid mentor.',
            variant: 'destructive',
          });
          mentorName = '';
        } else {
          mentorName = mentorResult.mentor!.name;
        }
      }

      const formData: any = {
        youthParticipant: data.youthParticipant,
        email: data.email,
        etransferEmailAddress: data.etransferEmailAddress || '',
        mailingAddress: data.mailingAddress || '',
        phoneNumber: data.phoneNumber || '',
        region: data.region,
        approved: data.approved,
        contractSigned: data.contractSigned,
        signedSyllabus: data.signedSyllabus,
        availability: data.availability || '',
        assignedMentor: mentorName,
        idProvided: data.idProvided,
        canadianStatus: data.canadianStatus,
        canadianStatusOther: data.canadianStatusOther || '',
        youthProposal: data.youthProposal || '',
        proofOfAffiliationWithSCD: data.proofOfAffiliationWithSCD,
        scagoCounterpart: data.scagoCounterpart || '',
        dob: data.dob,
        age: data.age,
        citizenshipStatus: data.citizenshipStatus || '',
        location: data.location || '',
        projectCategory: data.projectCategory || '',
        duties: data.duties || '',
        affiliationWithSCD: data.affiliationWithSCD || '',
        notes: data.notes || '',
        nextSteps: data.nextSteps || '',
        interviewed: data.interviewed || false,
        interviewNotes: data.interviewNotes || '',
        recruited: data.recruited || false,
        streetAddress: data.streetAddress || '',
        city: data.city || '',
        province: data.province || '',
        postalCode: data.postalCode || '',
      };

      if (data.sin && data.sin.trim() !== '') {
        formData.sin = data.sin;
      }

      // Include custom filename if changed
      if (customFileName && customFileName !== existingFileName) {
        formData.fileName = customFileName;
      }

      if (uploadedFile) {
        formData.fileUpload = uploadedFile;
        // If uploading new file, use the custom name or original name
        if (!formData.fileName) {
          formData.fileName = customFileName || uploadedFile.name;
        }
      }

      let result;
      if (participant) {
        result = await updateParticipant(participant.id, formData);
      } else {
        result = await createParticipant(formData);
      }

      if (result.success) {
        toast({
          title: participant ? 'Participant Updated' : 'Participant Created',
          description: participant
            ? 'Participant information has been updated successfully.'
            : 'New participant has been added to the system.',
        });
        onSuccess();
        onClose();
        form.reset();
        setUploadedFile(null);
        setExistingFileUrl(null);
        setExistingFileName(null);
        setCustomFileName('');
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to save participant',
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

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {participant ? 'Edit Participant' : 'Add New Participant'}
          </DialogTitle>
          <DialogDescription>
            {participant
              ? 'Update participant information and documents.'
              : 'Add a new youth participant to the program.'
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 min-h-0">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="youthParticipant"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter full name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email *</FormLabel>
                          <FormControl>
                            <Input type="email" {...field} placeholder="participant@example.com" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="phoneNumber"
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
                  </div>

                  <FormField
                    control={form.control}
                    name="etransferEmailAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>E-transfer Email</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} placeholder="etransfer@example.com" />
                        </FormControl>
                        <FormDescription>
                          For receiving payments
                        </FormDescription>
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
                            {regionOptions.map((region) => (
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

                  {/* Address Fields */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium">Mailing Address</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="streetAddress"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>Street Address</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="123 Main Street" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>City</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Toronto" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="province"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Province</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Ontario" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="postalCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Postal Code</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="M5V 3A8" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="dob"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date of Birth *</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="age"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Age</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              value={field.value || ''}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (value === '') {
                                  field.onChange(undefined);
                                } else {
                                  const numValue = parseInt(value);
                                  field.onChange(isNaN(numValue) ? undefined : numValue);
                                }
                              }}
                              placeholder="Auto-calculated"
                              disabled
                            />
                          </FormControl>
                          <FormDescription>
                            Auto-calculated from date of birth
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="affiliationWithSCD"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SCD Affiliation</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., Living with SCD, Advocate, Family member" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

            {/* Status & Documents and Program Details - Side by Side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Status and Documents */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Status & Documents</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-2 gap-3">
                      <FormField
                        control={form.control}
                        name="approved"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel className="text-sm font-normal">Approved</FormLabel>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="contractSigned"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel className="text-sm font-normal">Contract Signed</FormLabel>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="signedSyllabus"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel className="text-sm font-normal">Signed Syllabus</FormLabel>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="idProvided"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel className="text-sm font-normal">ID Provided</FormLabel>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="proofOfAffiliationWithSCD"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel className="text-sm font-normal">SCD Affiliation Proof</FormLabel>
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Program Details */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Program Details</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-4">
                    <FormField
                      control={form.control}
                      name="availability"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Availability</FormLabel>
                          <FormControl>
                            <AvailabilitySelector
                              value={field.value}
                              onChange={field.onChange}
                              disabled={false}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="assignedMentor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Assigned Mentor</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select mentor" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {mentors.length === 0 ? (
                                <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                                  No mentors available
                                </div>
                              ) : (
                                mentors.map((mentor) => (
                                  <SelectItem key={mentor.id} value={mentor.name}>
                                    {mentor.name}
                                    {mentor.title && ` - ${mentor.title}`}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="scagoCounterpart"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>SCAGO Counterpart</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Staff member name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </div>

            {/* Legal & Security and Document Upload - Side by Side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Legal and Security */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Legal & Security</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="canadianStatus"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Canadian Status *</FormLabel>
                        <FormControl>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                              {canadianStatusOptions.map((status) => (
                                <SelectItem key={status} value={status}>
                                  {status}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {form.watch('canadianStatus') === 'Other' && (
                    <FormField
                      control={form.control}
                      name="canadianStatusOther"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Please specify *</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Specify your Canadian status"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <FormField
                    control={form.control}
                    name="sin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SIN (Social Insurance Number)</FormLabel>
                        {participant?.sinLast4 && (
                          <Alert className="mb-2">
                            <AlertDescription>
                              SIN on file ending in: ••••{participant.sinLast4}
                            </AlertDescription>
                          </Alert>
                        )}
                        <FormControl>
                          <SINSecureField
                            value={participant ? '' : (field.value || '')}
                            onChange={field.onChange}
                            disabled={!form.watch('idProvided')}
                            placeholder={participant?.sinLast4 ? "Re-enter to update" : "Enter SIN"}
                            showValidation={true}
                            isEditing={!!participant}
                          />
                        </FormControl>
                        <FormDescription>
                          Enable "ID Provided" to enter SIN
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Document Upload - Enhanced */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Document Upload</CardTitle>
                  <CardDescription>Upload and manage supporting documents</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Existing File Display */}
                  {(existingFileUrl || uploadedFile) && (
                    <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="mt-1">
                            {getFileIcon(existingFileName || uploadedFile?.name || '')}
                          </div>
                          <div className="flex-1 min-w-0">
                            {isEditingFileName ? (
                              <div className="flex items-center gap-2">
                                <Input
                                  value={customFileName}
                                  onChange={(e) => setCustomFileName(e.target.value)}
                                  className="h-8 text-sm"
                                  placeholder="Enter filename"
                                />
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={handleFileNameSave}
                                >
                                  <Save className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium truncate">
                                  {uploadedFile ? uploadedFile.name : existingFileName}
                                </p>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setIsEditingFileName(true)}
                                  className="h-6 w-6 p-0"
                                >
                                  <Edit2 className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              {uploadedFile
                                ? `${(uploadedFile.size / 1024).toFixed(1)} KB - New upload`
                                : 'Existing file'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {existingFileUrl && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={handleFileView}
                              className="h-8 px-2"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleFileRemove}
                            className="h-8 px-2 text-destructive hover:text-destructive"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Upload Button */}
                  <div className="space-y-2">
                    <Label>{existingFileUrl || uploadedFile ? 'Replace File' : 'Upload File'}</Label>
                    <div className="flex items-center gap-4">
                      <Input
                        type="file"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        onChange={handleFileChange}
                        className="max-w-sm"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Accepted: PDF, DOC, DOCX, JPG, PNG (Max 10MB)
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Project Information and Program Status - Side by Side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Project Information */}
              <Card>
              <CardHeader>
                <CardTitle className="text-lg">Project Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="youthProposal"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Proposal</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Describe the project proposal..."
                          rows={4}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="projectCategory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., Advocacy, Education" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="duties"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duties</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Specific responsibilities" rows={3} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

              {/* Program Status & Notes */}
              <Card>
              <CardHeader>
                <CardTitle className="text-lg">Status & Notes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="interviewed"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="text-sm font-normal">Interviewed</FormLabel>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="recruited"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="text-sm font-normal">Recruited</FormLabel>
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="interviewNotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Interview Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Notes from interviews or meetings"
                          rows={3}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="nextSteps"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Next Steps</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Follow-up actions" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>General Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Additional comments"
                          rows={3}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {participant ? 'Update Participant' : 'Create Participant'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
