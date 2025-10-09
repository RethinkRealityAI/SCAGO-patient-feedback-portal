'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Users, Calendar, CheckCircle, X, Clock, MessageSquare, GraduationCap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { createAdvisorMeeting, getParticipants, getMentors } from '@/app/youth-empowerment/actions';
import { YEPParticipant, YEPMentor } from '@/lib/youth-empowerment';

const bulkMeetingFormSchema = z.object({
  advisorId: z.string().min(1, 'Advisor is required'),
  studentIds: z.array(z.string()).min(1, 'At least one student is required'),
  meetingDate: z.string().min(1, 'Meeting date is required'),
  duration: z.number().min(1, 'Duration must be at least 1 minute').max(480, 'Duration cannot exceed 8 hours').optional(),
  notes: z.string().optional(),
  topics: z.array(z.string()).optional(),
}).refine((data) => {
  // Validate that meeting date is not in the future by more than 1 year
  const meetingDate = new Date(data.meetingDate);
  const now = new Date();
  const oneYearFromNow = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
  
  if (meetingDate > oneYearFromNow) {
    return false;
  }
  return true;
}, {
  message: 'Meeting date cannot be more than 1 year in the future',
  path: ['meetingDate']
});

type BulkMeetingFormData = z.infer<typeof bulkMeetingFormSchema>;

interface BulkMeetingFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preselectedAdvisor?: string;
}

const commonTopics = [
  'Project Planning',
  'Research Methods',
  'Career Guidance',
  'Academic Support',
  'Personal Development',
  'Networking',
  'Skill Building',
  'Goal Setting',
  'Challenges & Solutions',
  'Next Steps',
  'Other'
];

export function BulkMeetingForm({ isOpen, onClose, onSuccess, preselectedAdvisor }: BulkMeetingFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);
  const [participants, setParticipants] = useState<YEPParticipant[]>([]);
  const [mentors, setMentors] = useState<YEPMentor[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const { toast } = useToast();

  const form = useForm<BulkMeetingFormData>({
    resolver: zodResolver(bulkMeetingFormSchema),
    defaultValues: {
      advisorId: preselectedAdvisor || '',
      studentIds: [],
      meetingDate: new Date().toISOString().slice(0, 16),
      duration: undefined,
      notes: '',
      topics: [],
    },
  });

  const loadData = useCallback(async () => {
    setIsDataLoading(true);
    setDataError(null);
    try {
      const [participantsData, mentorsData] = await Promise.all([
        getParticipants({ approved: true }),
        getMentors(),
      ]);
      
      setParticipants(participantsData);
      setMentors(mentorsData);
      
      // Check if we have the required data
      if (participantsData.length === 0) {
        setDataError('No approved participants found. Please add participants first.');
      }
      if (mentorsData.length === 0) {
        setDataError('No mentors found. Please add mentors first.');
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setDataError('Failed to load data. Please try again.');
      toast({
        title: 'Error',
        description: 'Failed to load participants and mentors data',
        variant: 'destructive',
      });
    } finally {
      setIsDataLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, loadData]);

  useEffect(() => {
    if (preselectedAdvisor) {
      form.setValue('advisorId', preselectedAdvisor);
    }
  }, [preselectedAdvisor, form]);

  const handleStudentToggle = useCallback((studentId: string) => {
    setSelectedStudents(prevStudents => {
      const newSelection = prevStudents.includes(studentId)
        ? prevStudents.filter(id => id !== studentId)
        : [...prevStudents, studentId];
      
      // Update form value immediately
      form.setValue('studentIds', newSelection, { shouldValidate: true });
      
      return newSelection;
    });
  }, [form]);

  const handleTopicToggle = useCallback((topic: string) => {
    setSelectedTopics(prevTopics => {
      const newTopics = prevTopics.includes(topic)
        ? prevTopics.filter(t => t !== topic)
        : [...prevTopics, topic];
      
      // Update form value immediately
      form.setValue('topics', newTopics, { shouldValidate: true });
      
      return newTopics;
    });
  }, [form]);

  const handleSelectAllStudents = useCallback(() => {
    const allIds = participants.map(p => p.id);
    setSelectedStudents(allIds);
    form.setValue('studentIds', allIds, { shouldValidate: true });
  }, [participants, form]);

  const handleSelectNoneStudents = useCallback(() => {
    setSelectedStudents([]);
    form.setValue('studentIds', [], { shouldValidate: true });
  }, [form]);

  const onSubmit = async (data: BulkMeetingFormData) => {
    setIsLoading(true);
    try {
      // Create meeting records for each student with the same advisor
      const meetingRecords = selectedStudents.map(studentId => ({
        studentId,
        advisorId: data.advisorId,
        meetingDate: data.meetingDate,
        duration: data.duration,
        notes: data.notes,
        topics: selectedTopics,
      }));

      // Process each meeting record
      const results = [];
      for (const record of meetingRecords) {
        const result = await createAdvisorMeeting(record);
        results.push(result);
      }

      const successCount = results.filter(r => r.success).length;
      const totalRecords = meetingRecords.length;

      if (successCount === totalRecords) {
        toast({
          title: 'Bulk Meetings Recorded',
          description: `Successfully recorded ${totalRecords} meetings with the same advisor.`,
        });
        // Reset form and state
        form.reset({
          advisorId: preselectedAdvisor || '',
          studentIds: [],
          meetingDate: new Date().toISOString().slice(0, 16),
          duration: undefined,
          notes: '',
          topics: [],
        });
        setSelectedStudents([]);
        setSelectedTopics([]);
        onSuccess();
        onClose();
      } else {
        toast({
          title: 'Partial Success',
          description: `Recorded ${successCount} of ${totalRecords} meetings.`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error submitting bulk meetings:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStudentName = useCallback((studentId: string) => {
    const student = participants.find(p => p.id === studentId);
    return student ? student.youthParticipant : 'Unknown Student';
  }, [participants]);

  const getAdvisorName = useCallback((advisorId: string) => {
    const advisor = mentors.find(m => m.id === advisorId);
    return advisor ? advisor.name : 'Unknown Advisor';
  }, [mentors]);

  const watchedAdvisorId = form.watch('advisorId');
  const selectedAdvisor = useMemo(() => 
    mentors.find(m => m.id === watchedAdvisorId), 
    [mentors, watchedAdvisorId]
  );

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Bulk Meeting Recording
          </DialogTitle>
          <DialogDescription>
            Record the same meeting for multiple students with one advisor
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 min-h-0">
            {/* Data Loading and Error States */}
            {isDataLoading && (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span>Loading participants and mentors...</span>
              </div>
            )}
            
            {dataError && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="text-destructive font-medium">Data Loading Error</div>
                </div>
                <div className="text-destructive/80 text-sm mt-1">{dataError}</div>
              </div>
            )}
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Advisor Selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <GraduationCap className="h-5 w-5" />
                    Select Advisor
                  </CardTitle>
                  <CardDescription>
                    Choose the advisor for all meetings
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="advisorId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Advisor *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value as any}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select advisor" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {mentors.length === 0 ? (
                              <SelectItem value="" disabled>
                                <div className="flex flex-col">
                                  <span className="font-medium text-muted-foreground">No mentors available</span>
                                  <span className="text-sm text-muted-foreground">
                                    Please add mentors first
                                  </span>
                                </div>
                              </SelectItem>
                            ) : (
                              mentors.map((mentor) => (
                                <SelectItem key={mentor.id} value={mentor.id}>
                                  <div className="flex flex-col">
                                    <span className="font-medium">{mentor.name}</span>
                                    <span className="text-sm text-muted-foreground">
                                      {mentor.title}
                                    </span>
                                  </div>
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {selectedAdvisor && (
                    <div className="p-3 bg-muted/50 rounded-lg mt-4">
                      <h4 className="font-medium">{selectedAdvisor.name}</h4>
                      <p className="text-sm text-muted-foreground">{selectedAdvisor.title}</p>
                      <div className="text-sm text-muted-foreground mt-1">
                        Currently assigned to {selectedAdvisor.assignedStudents.length} participant(s)
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Student Selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Select Students
                  </CardTitle>
                  <CardDescription>
                    Choose which students attended this meeting
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAllStudents}
                    >
                      Select All
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleSelectNoneStudents}
                    >
                      Select None
                    </Button>
                  </div>

                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {participants.length === 0 ? (
                      <div className="flex items-center justify-center p-8 text-center">
                        <div>
                          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                          <p className="text-muted-foreground">No participants available</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Please add participants first
                          </p>
                        </div>
                      </div>
                    ) : (
                      participants.map((participant) => (
                      <div
                        key={participant.id}
                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedStudents.includes(participant.id)
                            ? 'bg-primary/10 border-primary'
                            : 'hover:bg-muted/50'
                        }`}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleStudentToggle(participant.id);
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={selectedStudents.includes(participant.id)}
                            readOnly
                            className="pointer-events-none"
                          />
                          <div className="flex-1">
                            <div className="font-medium">{participant.youthParticipant}</div>
                            <div className="text-sm text-muted-foreground">
                              {participant.region} • {participant.email}
                            </div>
                            {participant.assignedMentor && (
                              <Badge variant="outline" className="mt-1 text-xs">
                                Mentor: {participant.assignedMentor}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="ml-4">
                          {selectedStudents.includes(participant.id) ? (
                            <CheckCircle className="h-5 w-5 text-primary" />
                          ) : (
                            <div className="w-5 h-5 rounded border-2 border-muted-foreground" />
                          )}
                        </div>
                      </div>
                      ))
                    )}
                  </div>

                  {selectedStudents.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Selected Students:</Label>
                      <div className="flex flex-wrap gap-2">
                        {selectedStudents.map((studentId) => (
                          <Badge
                            key={studentId}
                            variant="secondary"
                            className="flex items-center gap-1"
                          >
                            {getStudentName(studentId)}
                            <X
                              className="h-3 w-3 cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStudentToggle(studentId);
                              }}
                            />
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Meeting Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Meeting Details
                </CardTitle>
                <CardDescription>
                  Set the date, time, and duration for all meetings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="meetingDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Meeting Date & Time *</FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="duration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duration (minutes)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...field} 
                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                            placeholder="e.g., 60"
                          />
                        </FormControl>
                        <FormDescription>
                          How long did the meeting last?
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Meeting Topics */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Meeting Topics</CardTitle>
                <CardDescription>
                  What was discussed during the meeting?
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {commonTopics.map((topic) => (
                    <div
                      key={topic}
                      className={`flex items-center space-x-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                        selectedTopics.includes(topic)
                          ? 'bg-primary/10 border-primary'
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleTopicToggle(topic);
                      }}
                    >
                      <Checkbox
                        checked={selectedTopics.includes(topic)}
                        readOnly
                        className="pointer-events-none"
                      />
                      <Label className="text-sm cursor-pointer pointer-events-none">{topic}</Label>
                    </div>
                  ))}
                </div>

                {selectedTopics.length > 0 && (
                  <div className="mt-4">
                    <Label className="text-sm font-medium">Selected Topics:</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedTopics.map((topic) => (
                        <Badge key={topic} variant="secondary">
                          {topic}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Meeting Notes */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Meeting Notes
                </CardTitle>
                <CardDescription>
                  Record key points and outcomes from the meeting
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder="Record key discussion points, decisions made, next steps, and any important outcomes..."
                          rows={4}
                        />
                      </FormControl>
                      <FormDescription>
                        These notes will be added to all meeting records
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Summary */}
            {selectedStudents.length > 0 && (
              <Card>
                <CardHeader>
                <CardTitle className="text-lg">Summary</CardTitle>
                <CardDescription>
                  Review the meeting records that will be created
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Total Meeting Records:</span>
                    <Badge variant="default" className="text-lg px-3 py-1">
                      {selectedStudents.length}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {getAdvisorName(form.watch('advisorId'))} will have {selectedStudents.length} meeting record(s) created
                  </div>
                </div>
              </CardContent>
            </Card>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading || isDataLoading || participants.length === 0 || mentors.length === 0 || selectedStudents.length === 0}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Record Bulk Meetings ({selectedStudents.length} records)
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
