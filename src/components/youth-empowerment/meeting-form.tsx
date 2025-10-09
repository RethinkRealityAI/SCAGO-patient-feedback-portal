'use client';

import { useState, useEffect } from 'react';
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
import { Loader2, Calendar, Clock, Users, MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { createAdvisorMeeting, getParticipants, getMentors } from '@/app/youth-empowerment/actions';
import { YEPParticipant, YEPMentor } from '@/lib/youth-empowerment';

const meetingFormSchema = z.object({
  studentId: z.string().min(1, 'Student is required'),
  advisorId: z.string().min(1, 'Advisor is required'),
  meetingDate: z.string().min(1, 'Meeting date is required'),
  duration: z.number().optional(),
  notes: z.string().optional(),
  topics: z.array(z.string()).optional(),
});

type MeetingFormData = z.infer<typeof meetingFormSchema>;

interface MeetingFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preselectedStudent?: string;
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

export function MeetingForm({ 
  isOpen, 
  onClose, 
  onSuccess, 
  preselectedStudent, 
  preselectedAdvisor 
}: MeetingFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [participants, setParticipants] = useState<YEPParticipant[]>([]);
  const [mentors, setMentors] = useState<YEPMentor[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const { toast } = useToast();

  const form = useForm<MeetingFormData>({
    resolver: zodResolver(meetingFormSchema),
    defaultValues: {
      studentId: preselectedStudent || '',
      advisorId: preselectedAdvisor || '',
      meetingDate: new Date().toISOString().slice(0, 16), // Current date/time
      duration: undefined,
      notes: '',
      topics: [],
    },
  });

  useEffect(() => {
    if (isOpen) {
      loadData();
      if (preselectedStudent) {
        form.setValue('studentId', preselectedStudent);
      }
      if (preselectedAdvisor) {
        form.setValue('advisorId', preselectedAdvisor);
      }
    }
  }, [isOpen, preselectedStudent, preselectedAdvisor]);

  const loadData = async () => {
    try {
      const [participantsData, mentorsData] = await Promise.all([
        getParticipants({ approved: true }), // Only show approved participants
        getMentors(),
      ]);
      setParticipants(participantsData);
      setMentors(mentorsData);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleTopicToggle = (topic: string) => {
    const newTopics = selectedTopics.includes(topic)
      ? selectedTopics.filter(t => t !== topic)
      : [...selectedTopics, topic];
    
    setSelectedTopics(newTopics);
    form.setValue('topics', newTopics);
  };

  const onSubmit = async (data: MeetingFormData) => {
    setIsLoading(true);
    try {
      const result = await createAdvisorMeeting({
        ...data,
        topics: selectedTopics,
      });

      if (result.success) {
        toast({
          title: 'Meeting Recorded',
          description: 'Advisor meeting has been successfully recorded.',
        });
        onSuccess();
        onClose();
        form.reset();
        setSelectedTopics([]);
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to record meeting',
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

  const selectedStudent = participants.find(p => p.id === form.watch('studentId'));
  const selectedAdvisor = mentors.find(m => m.id === form.watch('advisorId'));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Record Advisor Meeting
          </DialogTitle>
          <DialogDescription>
            Record a meeting between a participant and their advisor
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 min-h-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Meeting Participants */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Meeting Participants
                  </CardTitle>
                  <CardDescription>Select the participant and advisor</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="studentId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Participant *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select participant" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {participants.map((participant) => (
                              <SelectItem key={participant.id} value={participant.id}>
                                <div className="flex flex-col">
                                  <span className="font-medium">{participant.youthParticipant}</span>
                                  <span className="text-sm text-muted-foreground">
                                    {participant.region} • {participant.email}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {selectedStudent && (
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <h4 className="font-medium">{selectedStudent.youthParticipant}</h4>
                      <div className="text-sm text-muted-foreground mt-1">
                        <p>{selectedStudent.region} • {selectedStudent.email}</p>
                        {selectedStudent.assignedMentor && (
                          <p>Assigned Mentor: {selectedStudent.assignedMentor}</p>
                        )}
                      </div>
                    </div>
                  )}

                  <FormField
                    control={form.control}
                    name="advisorId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Advisor *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select advisor" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {mentors.map((mentor) => (
                              <SelectItem key={mentor.id} value={mentor.id}>
                                <div className="flex flex-col">
                                  <span className="font-medium">{mentor.name}</span>
                                  <span className="text-sm text-muted-foreground">
                                    {mentor.title}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {selectedAdvisor && (
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <h4 className="font-medium">{selectedAdvisor.name}</h4>
                      <p className="text-sm text-muted-foreground">{selectedAdvisor.title}</p>
                      <div className="text-sm text-muted-foreground mt-1">
                        Assigned to {selectedAdvisor.assignedStudents.length} participant(s)
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Meeting Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Meeting Details
                  </CardTitle>
                  <CardDescription>When and how long the meeting lasted</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
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
                </CardContent>
              </Card>
            </div>

            {/* Meeting Topics */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Meeting Topics</CardTitle>
                <CardDescription>What was discussed during the meeting?</CardDescription>
              </CardHeader>
              <CardContent className="max-h-60 overflow-y-auto">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {commonTopics.map((topic) => (
                    <div
                      key={topic}
                      className={`flex items-center space-x-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                        selectedTopics.includes(topic)
                          ? 'bg-primary/10 border-primary'
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => handleTopicToggle(topic)}
                    >
                      <Checkbox
                        checked={selectedTopics.includes(topic)}
                        readOnly
                      />
                      <Label className="text-sm cursor-pointer">{topic}</Label>
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
                <CardDescription>Record key points and outcomes from the meeting</CardDescription>
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
                        Detailed notes about what was discussed and any action items
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
                Record Meeting
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
