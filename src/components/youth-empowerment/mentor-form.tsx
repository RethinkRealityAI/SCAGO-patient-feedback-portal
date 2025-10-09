'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { X, Loader2, UserPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { createMentor, updateMentor, getParticipants } from '@/app/youth-empowerment/actions';
import { mentorTitleOptions } from '@/lib/youth-empowerment';
import { YEPMentor, YEPParticipant } from '@/lib/youth-empowerment';

const mentorFormSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  title: z.string().min(2, 'Title is required'),
  assignedStudents: z.array(z.string()).default([]),
});

type MentorFormData = z.infer<typeof mentorFormSchema>;

interface MentorFormProps {
  mentor?: YEPMentor;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function MentorForm({ mentor, isOpen, onClose, onSuccess }: MentorFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [participants, setParticipants] = useState<YEPParticipant[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const { toast } = useToast();

  const form = useForm<MentorFormData>({
    resolver: zodResolver(mentorFormSchema),
    defaultValues: {
      name: mentor?.name || '',
      title: mentor?.title || '',
      assignedStudents: mentor?.assignedStudents || [],
    },
  });

  useEffect(() => {
    if (isOpen) {
      loadParticipants();
      if (mentor?.assignedStudents) {
        setSelectedStudents(mentor.assignedStudents);
        form.setValue('assignedStudents', mentor.assignedStudents);
      }
    }
  }, [isOpen, mentor]);

  const loadParticipants = async () => {
    try {
      const participantsData = await getParticipants();
      setParticipants(participantsData);
    } catch (error) {
      console.error('Error loading participants:', error);
    }
  };

  const handleStudentToggle = (studentId: string) => {
    const newSelection = selectedStudents.includes(studentId)
      ? selectedStudents.filter(id => id !== studentId)
      : [...selectedStudents, studentId];
    
    setSelectedStudents(newSelection);
    form.setValue('assignedStudents', newSelection);
  };

  const onSubmit = async (data: MentorFormData) => {
    setIsLoading(true);
    try {
      let result;
      if (mentor) {
        result = await updateMentor(mentor.id, data);
      } else {
        result = await createMentor(data);
      }

      if (result.success) {
        toast({
          title: mentor ? 'Mentor Updated' : 'Mentor Created',
          description: mentor 
            ? 'Mentor information has been updated successfully.'
            : 'New mentor has been added to the system.',
        });
        onSuccess();
        onClose();
        form.reset();
        setSelectedStudents([]);
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to save mentor',
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

  const getStudentName = (studentId: string) => {
    const student = participants.find(p => p.id === studentId);
    return student ? student.youthParticipant : 'Unknown Student';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mentor ? 'Edit Mentor' : 'Add New Mentor'}
          </DialogTitle>
          <DialogDescription>
            {mentor 
              ? 'Update mentor information and assigned students.'
              : 'Add a new mentor to the program.'
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 min-h-0">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Mentor Information</CardTitle>
                <CardDescription>Basic mentor details and role</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mentor Name *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter full name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title/Role *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select title" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {mentorTitleOptions.map((title) => (
                            <SelectItem key={title} value={title}>
                              {title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Assigned Students</CardTitle>
                <CardDescription>
                  Select which participants this mentor will work with
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {participants.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <UserPlus className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No participants available</p>
                    <p className="text-sm">Add participants first to assign them to mentors</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto">
                      {participants.map((participant) => (
                        <div
                          key={participant.id}
                          className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                            selectedStudents.includes(participant.id)
                              ? 'bg-primary/10 border-primary'
                              : 'hover:bg-muted/50'
                          }`}
                          onClick={() => handleStudentToggle(participant.id)}
                        >
                          <div className="flex-1">
                            <div className="font-medium">{participant.youthParticipant}</div>
                            <div className="text-sm text-muted-foreground">
                              {participant.region} • {participant.email}
                            </div>
                            {participant.approved && (
                              <Badge variant="secondary" className="mt-1">
                                Approved
                              </Badge>
                            )}
                          </div>
                          <div className="ml-4">
                            {selectedStudents.includes(participant.id) ? (
                              <Badge variant="default">Assigned</Badge>
                            ) : (
                              <div className="w-4 h-4 rounded border-2 border-muted-foreground" />
                            )}
                          </div>
                        </div>
                      ))}
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
                  </div>
                )}
              </CardContent>
            </Card>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {mentor ? 'Update Mentor' : 'Create Mentor'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
