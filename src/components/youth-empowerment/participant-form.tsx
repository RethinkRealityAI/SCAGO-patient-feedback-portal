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
import { Loader2, Upload, FileText, Eye, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { createParticipant, updateParticipant, getMentors } from '@/app/youth-empowerment/actions';
import { regionOptions, canadianStatusOptions, validateSINLenient } from '@/lib/youth-empowerment';
import { SINSecureField } from '@/components/yep-forms/sin-secure-field';
import { SelectWithOther } from '@/components/ui/select-with-other';
import { AvailabilitySelector } from '@/components/youth-empowerment/availability-selector';
import { YEPParticipant, YEPMentor } from '@/lib/youth-empowerment';

const participantFormSchema = z.object({
  youthParticipant: z.string().min(2, 'Name is required'),
  email: z.string().email('Valid email is required'),
  etransferEmailAddress: z.string().email('Valid email is required').optional().or(z.literal('')),
  mailingAddress: z.string().optional(),
  phoneNumber: z.string().optional(),
  region: z.string().min(1, 'Region is required'),
  approved: z.boolean().default(false),
  contractSigned: z.boolean().default(false),
  signedSyllabus: z.boolean().default(false),
  availability: z.string().optional(),
  assignedMentor: z.string().optional(),
  idProvided: z.boolean().default(false),
  canadianStatus: z.enum(['Canadian Citizen', 'Permanent Resident', 'Other']),
  canadianStatusOther: z.string().optional(),
  sin: z.string().optional().refine((val) => {
    // Only validate if the value exists and is not empty
    if (!val || val.trim() === '') return true;
    return validateSINLenient(val);
  }, 'Invalid SIN format'),
  youthProposal: z.string().optional(),
  proofOfAffiliationWithSCD: z.boolean().default(false),
  scagoCounterpart: z.string().optional(),
  dob: z.string().min(1, 'Date of birth is required'),
  file: z.instanceof(File).optional(),
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

export function ParticipantForm({ participant, isOpen, onClose, onSuccess }: ParticipantFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [mentors, setMentors] = useState<YEPMentor[]>([]);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [existingFileUrl, setExistingFileUrl] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<ParticipantFormData>({
    resolver: zodResolver(participantFormSchema),
    mode: 'onSubmit', // Only validate on submit, not on every change
    defaultValues: {
      youthParticipant: participant?.youthParticipant || '',
      email: participant?.email || '',
      etransferEmailAddress: participant?.etransferEmailAddress || '',
      mailingAddress: participant?.mailingAddress || '',
      phoneNumber: participant?.phoneNumber || '',
      region: participant?.region || '',
      approved: participant?.approved || false,
      contractSigned: participant?.contractSigned || false,
      signedSyllabus: participant?.signedSyllabus || false,
      availability: participant?.availability || '',
      assignedMentor: participant?.assignedMentor || '',
      idProvided: participant?.idProvided || false,
      canadianStatus: participant?.canadianStatus || 'Canadian Citizen',
      canadianStatusOther: participant?.canadianStatusOther || '',
      sin: '', // Never pre-fill SIN for security
      youthProposal: participant?.youthProposal || '',
      proofOfAffiliationWithSCD: participant?.proofOfAffiliationWithSCD || false,
      scagoCounterpart: participant?.scagoCounterpart || '',
      dob: participant?.dob || '',
    },
  });

  useEffect(() => {
    if (isOpen) {
      loadMentors();
      if (participant?.fileUrl) {
        setExistingFileUrl(participant.fileUrl);
      } else {
        setExistingFileUrl(null);
      }
    }
  }, [isOpen, participant]);

  // Reset form when participant changes
  useEffect(() => {
    if (participant) {
      form.reset({
        youthParticipant: participant.youthParticipant || '',
        email: participant.email || '',
        etransferEmailAddress: participant.etransferEmailAddress || '',
        mailingAddress: participant.mailingAddress || '',
        phoneNumber: participant.phoneNumber || '',
        region: participant.region || '',
        approved: participant.approved || false,
        contractSigned: participant.contractSigned || false,
        signedSyllabus: participant.signedSyllabus || false,
        availability: participant.availability || '',
        assignedMentor: participant.assignedMentor || '',
        idProvided: participant.idProvided || false,
        canadianStatus: participant.canadianStatus || 'Canadian Citizen',
        canadianStatusOther: participant.canadianStatusOther || '',
        sin: '', // Never pre-fill SIN for security - always empty when editing
        youthProposal: participant.youthProposal || '',
        proofOfAffiliationWithSCD: participant.proofOfAffiliationWithSCD || false,
        scagoCounterpart: participant.scagoCounterpart || '',
        dob: participant.dob || '',
      });
      // Explicitly clear the SIN field to ensure it's completely empty
      form.setValue('sin', '');
      // Clear any validation errors for SIN field
      form.clearErrors('sin');
      // Reset file states
      setUploadedFile(null);
      setExistingFileUrl(participant.fileUrl || null);
    } else {
      // Reset to default values for new participant
      form.reset({
        youthParticipant: '',
        email: '',
        etransferEmailAddress: '',
        mailingAddress: '',
        phoneNumber: '',
        region: '',
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
      });
      // Reset file states for new participant
      setUploadedFile(null);
      setExistingFileUrl(null);
      // Clear any validation errors for SIN field
      form.clearErrors('sin');
    }
  }, [participant?.id, form]); // Only depend on participant ID, not the entire participant object

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
      setUploadedFile(file);
      setExistingFileUrl(null); // Clear existing file when new one is selected
    }
  };

  const handleFileDownload = () => {
    if (existingFileUrl) {
      window.open(existingFileUrl, '_blank');
    }
  };

  const onSubmit = async (data: ParticipantFormData) => {
    setIsLoading(true);
    try {
      // Clean the data to remove undefined values
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
        assignedMentor: data.assignedMentor || '',
        idProvided: data.idProvided,
        canadianStatus: data.canadianStatus,
        canadianStatusOther: data.canadianStatusOther || '',
        youthProposal: data.youthProposal || '',
        proofOfAffiliationWithSCD: data.proofOfAffiliationWithSCD,
        scagoCounterpart: data.scagoCounterpart || '',
        dob: data.dob,
      };

      // Only include SIN if provided and not empty
      if (data.sin && data.sin.trim() !== '') {
        formData.sin = data.sin;
      }

      // Only include file if a new one is uploaded
      if (uploadedFile) {
        formData.file = uploadedFile;
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Basic Information</CardTitle>
                  <CardDescription>Personal details and contact information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="youthParticipant"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Youth Participant Name *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter full name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address *</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} placeholder="participant@example.com" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="etransferEmailAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>E-transfer Email Address</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} placeholder="etransfer@example.com" />
                        </FormControl>
                        <FormDescription>
                          Email address for receiving e-transfers (optional)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phoneNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input type="tel" {...field} placeholder="(555) 123-4567" />
                        </FormControl>
                        <FormDescription>
                          Contact phone number (optional)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="mailingAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mailing Address</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            placeholder="123 Main St, City, Province, Postal Code"
                            rows={3}
                          />
                        </FormControl>
                        <FormDescription>
                          Full mailing address (optional)
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
                </CardContent>
              </Card>

              {/* Status and Documents */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Status & Documents</CardTitle>
                  <CardDescription>Program status and required documents</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <FormField
                      control={form.control}
                      name="approved"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Approved</FormLabel>
                            <FormDescription>
                              Participant has been approved for the program
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="contractSigned"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Contract Signed</FormLabel>
                            <FormDescription>
                              Participant has signed the program contract
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="signedSyllabus"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Signed Syllabus</FormLabel>
                            <FormDescription>
                              Participant has signed the program syllabus
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="idProvided"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>ID Provided</FormLabel>
                            <FormDescription>
                              Participant has provided valid identification
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="proofOfAffiliationWithSCD"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Proof of SCD Affiliation</FormLabel>
                            <FormDescription>
                              Participant has provided proof of SCD affiliation
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Program Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Program Details</CardTitle>
                  <CardDescription>Assignment and availability information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
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
                        <FormDescription>
                          Select days and time slots when the participant is available
                        </FormDescription>
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
                            {mentors.map((mentor) => (
                              <SelectItem key={mentor.id} value={mentor.id}>
                                {mentor.name} - {mentor.title}
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
                    name="scagoCounterpart"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SCAGO Counterpart</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Staff member name" />
                        </FormControl>
                        <FormDescription>
                          SCAGO staff member assigned to this participant
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Legal and Security */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Legal & Security</CardTitle>
                  <CardDescription>Legal status and sensitive information</CardDescription>
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
                          <FormLabel>Please specify your status</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Please specify your Canadian status"
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
                              A SIN was previously provided (ending in: ••••{participant.sinLast4}). 
                              Re-enter the full SIN to update it, or leave blank to keep the existing one.
                            </AlertDescription>
                          </Alert>
                        )}
                        <FormControl>
                          <SINSecureField
                            value={participant ? '' : (field.value || '')}
                            onChange={field.onChange}
                            disabled={!form.watch('idProvided')}
                            placeholder={participant?.sinLast4 ? "Re-enter SIN to update, or leave blank" : "Enter SIN (will be securely hashed)"}
                            showValidation={true}
                            isEditing={!!participant}
                          />
                        </FormControl>
                        <FormDescription>
                          Only the last 4 digits will be stored for reference. Enable "ID Provided" to enter SIN.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Project Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Project Information</CardTitle>
                <CardDescription>Youth proposal and project details</CardDescription>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="youthProposal"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Youth Proposal</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder="Describe the youth's project proposal..."
                          rows={4}
                        />
                      </FormControl>
                      <FormDescription>
                        Detailed description of the proposed project
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* File Upload */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Document Upload</CardTitle>
                <CardDescription>Upload supporting documents</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {existingFileUrl && !uploadedFile && (
                  <Alert>
                    <FileText className="h-4 w-4" />
                    <AlertDescription className="flex items-center justify-between">
                      <span>Existing file attached</span>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleFileDownload}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(existingFileUrl, '_blank')}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                <FormField
                  control={form.control}
                  name="file"
                  render={({ field: { onChange, ...field } }) => (
                    <FormItem>
                      <FormLabel>Upload File</FormLabel>
                      <FormControl>
                        <div className="flex items-center gap-4">
                          <Input
                            type="file"
                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                handleFileChange(e);
                                onChange(file);
                              }
                            }}
                            className="max-w-sm"
                          />
                          {uploadedFile && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Upload className="h-4 w-4" />
                              {uploadedFile.name}
                            </div>
                          )}
                        </div>
                      </FormControl>
                      <FormDescription>
                        Upload supporting documents (PDF, DOC, images)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

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
