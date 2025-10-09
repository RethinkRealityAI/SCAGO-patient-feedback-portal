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
import { Loader2, Users, Calendar, CheckCircle, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { markWorkshopAttendance, getWorkshops, getParticipants } from '@/app/youth-empowerment/actions';
import { YEPWorkshop, YEPParticipant } from '@/lib/youth-empowerment';

const attendanceFormSchema = z.object({
  workshopIds: z.array(z.string()).min(1, 'At least one workshop is required'),
  studentIds: z.array(z.string()).min(1, 'At least one student is required'),
  attendedAt: z.string().optional(),
  notes: z.string().optional(),
});

type AttendanceFormData = z.infer<typeof attendanceFormSchema>;

interface AttendanceFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preselectedWorkshop?: string;
  preselectedStudent?: string;
}

export function AttendanceForm({ isOpen, onClose, onSuccess, preselectedWorkshop, preselectedStudent }: AttendanceFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [workshops, setWorkshops] = useState<YEPWorkshop[]>([]);
  const [participants, setParticipants] = useState<YEPParticipant[]>([]);
  const [selectedWorkshops, setSelectedWorkshops] = useState<string[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const { toast } = useToast();

  const form = useForm<AttendanceFormData>({
    resolver: zodResolver(attendanceFormSchema),
    defaultValues: {
      workshopIds: preselectedWorkshop ? [preselectedWorkshop] : [],
      studentIds: preselectedStudent ? [preselectedStudent] : [],
      attendedAt: new Date().toISOString().slice(0, 16), // Current date/time
      notes: '',
    },
  });

  useEffect(() => {
    if (isOpen) {
      loadData();
      if (preselectedWorkshop) {
        setSelectedWorkshops([preselectedWorkshop]);
        form.setValue('workshopIds', [preselectedWorkshop]);
      }
      if (preselectedStudent) {
        setSelectedStudents([preselectedStudent]);
        form.setValue('studentIds', [preselectedStudent]);
      }
    }
  }, [isOpen, preselectedWorkshop, preselectedStudent]);

  const loadData = async () => {
    try {
      const [workshopsData, participantsData] = await Promise.all([
        getWorkshops(),
        getParticipants({ approved: true }), // Only show approved participants
      ]);
      setWorkshops(workshopsData);
      setParticipants(participantsData);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleWorkshopToggle = (workshopId: string) => {
    const newSelection = selectedWorkshops.includes(workshopId)
      ? selectedWorkshops.filter(id => id !== workshopId)
      : [...selectedWorkshops, workshopId];
    
    setSelectedWorkshops(newSelection);
    form.setValue('workshopIds', newSelection);
  };

  const handleStudentToggle = (studentId: string) => {
    const newSelection = selectedStudents.includes(studentId)
      ? selectedStudents.filter(id => id !== studentId)
      : [...selectedStudents, studentId];
    
    setSelectedStudents(newSelection);
    form.setValue('studentIds', newSelection);
  };

  const handleSelectAllWorkshops = () => {
    const allIds = workshops.map(w => w.id);
    setSelectedWorkshops(allIds);
    form.setValue('workshopIds', allIds);
  };

  const handleSelectNoneWorkshops = () => {
    setSelectedWorkshops([]);
    form.setValue('workshopIds', []);
  };

  const handleSelectAllStudents = () => {
    const allIds = participants.map(p => p.id);
    setSelectedStudents(allIds);
    form.setValue('studentIds', allIds);
  };

  const handleSelectNoneStudents = () => {
    setSelectedStudents([]);
    form.setValue('studentIds', []);
  };

  const onSubmit = async (data: AttendanceFormData) => {
    setIsLoading(true);
    try {
      // Create attendance records for each workshop-student combination
      const attendanceRecords = [];
      
      for (const workshopId of data.workshopIds) {
        for (const studentId of data.studentIds) {
          attendanceRecords.push({
            workshopId,
            studentId,
            attendedAt: data.attendedAt ? new Date(data.attendedAt) : new Date(),
            notes: data.notes || '',
          });
        }
      }

      // Process each attendance record
      const results = [];
      for (const record of attendanceRecords) {
        const result = await markWorkshopAttendance({
          workshopId: record.workshopId,
          studentIds: [record.studentId],
          attendedAt: record.attendedAt.toISOString(),
          notes: record.notes,
        });
        results.push(result);
      }

      const successCount = results.filter(r => r.success).length;
      const totalRecords = attendanceRecords.length;

      if (successCount === totalRecords) {
        toast({
          title: 'Attendance Marked',
          description: `Successfully marked attendance for ${totalRecords} workshop-student combinations.`,
        });
        onSuccess();
        onClose();
        form.reset();
        setSelectedWorkshops([]);
        setSelectedStudents([]);
      } else {
        toast({
          title: 'Partial Success',
          description: `Marked attendance for ${successCount} of ${totalRecords} combinations.`,
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
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Mark Workshop Attendance
          </DialogTitle>
          <DialogDescription>
            Record which participants attended workshops
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 min-h-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Workshop Selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Select Workshops
                  </CardTitle>
                  <CardDescription>Choose which workshops to mark attendance for</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {workshops.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No workshops available</p>
                    </div>
                  ) : (
                    <>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleSelectAllWorkshops}
                        >
                          Select All
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleSelectNoneWorkshops}
                        >
                          Select None
                        </Button>
                      </div>

                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {workshops.map((workshop) => (
                          <div
                            key={workshop.id}
                            className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                              selectedWorkshops.includes(workshop.id)
                                ? 'bg-primary/10 border-primary'
                                : 'hover:bg-muted/50'
                            }`}
                            onClick={() => handleWorkshopToggle(workshop.id)}
                          >
                            <div className="flex items-center gap-3">
                              <Checkbox
                                checked={selectedWorkshops.includes(workshop.id)}
                              />
                              <div className="flex-1">
                                <div className="font-medium">{workshop.title}</div>
                                <div className="text-sm text-muted-foreground">
                                  {new Date(workshop.date).toLocaleDateString()}
                                  {workshop.location && ` • ${workshop.location}`}
                                </div>
                                {workshop.capacity && (
                                  <div className="text-xs text-muted-foreground mt-1">
                                    Capacity: {workshop.capacity}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="ml-4">
                              {selectedWorkshops.includes(workshop.id) ? (
                                <CheckCircle className="h-5 w-5 text-primary" />
                              ) : (
                                <div className="w-5 h-5 rounded border-2 border-muted-foreground" />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {selectedWorkshops.length > 0 && (
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">
                            Selected Workshops ({selectedWorkshops.length}):
                          </Label>
                          <div className="flex flex-wrap gap-2">
                            {selectedWorkshops.map((workshopId) => {
                              const workshop = workshops.find(w => w.id === workshopId);
                              return (
                                <Badge
                                  key={workshopId}
                                  variant="secondary"
                                  className="flex items-center gap-1"
                                >
                                  {workshop?.title}
                                  <X
                                    className="h-3 w-3 cursor-pointer"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleWorkshopToggle(workshopId);
                                    }}
                                  />
                                </Badge>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  <FormField
                    control={form.control}
                    name="attendedAt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Attendance Date & Time</FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} />
                        </FormControl>
                        <FormDescription>
                          When the attendance was recorded (defaults to now)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Student Selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Select Participants
                  </CardTitle>
                  <CardDescription>
                    Choose which participants attended this workshop
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {participants.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No approved participants available</p>
                    </div>
                  ) : (
                    <>
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
                            <div className="flex items-center gap-3">
                              <Checkbox
                                checked={selectedStudents.includes(participant.id)}
                                // readOnly not supported on Checkbox component
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
                        ))}
                      </div>

                      {selectedStudents.length > 0 && (
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">
                            Selected Participants ({selectedStudents.length}):
                          </Label>
                          <div className="flex flex-wrap gap-2">
                            {selectedStudents.map((studentId) => {
                              const student = participants.find(p => p.id === studentId);
                              return (
                                <Badge
                                  key={studentId}
                                  variant="secondary"
                                  className="flex items-center gap-1"
                                >
                                  {student?.youthParticipant}
                                  <X
                                    className="h-3 w-3 cursor-pointer"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleStudentToggle(studentId);
                                    }}
                                  />
                                </Badge>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Notes */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Additional Notes</CardTitle>
                <CardDescription>Optional notes about the attendance</CardDescription>
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
                          placeholder="Any additional notes about the attendance..."
                          rows={3}
                        />
                      </FormControl>
                      <FormDescription>
                        Optional notes about the workshop attendance
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
              <Button 
                type="submit" 
                disabled={isLoading || selectedStudents.length === 0 || selectedWorkshops.length === 0}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Mark Attendance ({selectedWorkshops.length} workshops × {selectedStudents.length} participants)
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
