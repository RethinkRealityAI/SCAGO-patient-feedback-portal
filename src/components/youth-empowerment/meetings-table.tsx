'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  MoreHorizontal, 
  Search, 
  Plus,
  MessageSquare,
  Calendar,
  Clock,
  User,
  GraduationCap,
  Filter,
  Download,
  FileText
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getAdvisorMeetings, getParticipants, getMentors, deleteMeeting } from '@/app/youth-empowerment/actions';
import { YEPParticipant, YEPMentor } from '@/lib/youth-empowerment';
import { MeetingForm } from './meeting-form';

interface MeetingRecord {
  id: string;
  studentId: string;
  advisorId: string;
  meetingDate: Date;
  duration?: number;
  notes?: string;
  topics?: string[];
  createdAt: Date;
  updatedAt: Date;
  // Populated fields
  studentName?: string;
  advisorName?: string;
}

interface MeetingsTableProps {
  onRefresh?: () => void;
}

export function MeetingsTable({ onRefresh }: MeetingsTableProps) {
  const [meetings, setMeetings] = useState<MeetingRecord[]>([]);
  const [participants, setParticipants] = useState<YEPParticipant[]>([]);
  const [mentors, setMentors] = useState<YEPMentor[]>([]);
  const [filteredMeetings, setFilteredMeetings] = useState<MeetingRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [studentFilter, setStudentFilter] = useState('all');
  const [advisorFilter, setAdvisorFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [meetingToDelete, setMeetingToDelete] = useState<MeetingRecord | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterMeetings();
  }, [meetings, searchTerm, studentFilter, advisorFilter, dateFilter]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [meetingsData, participantsData, mentorsData] = await Promise.all([
        getAdvisorMeetings(),
        getParticipants(),
        getMentors(),
      ]);

      // Populate meeting records with names
      const populatedMeetings = meetingsData.map(meeting => {
        const student = participantsData.find((p: any) => p.id === (meeting as any).studentId);
        const advisor = mentorsData.find((m: any) => m.id === (meeting as any).advisorId);
        return {
          ...meeting,
          studentName: student?.youthParticipant || 'Unknown Student',
          advisorName: advisor?.name || 'Unknown Mentor',
        };
      });

      setMeetings(populatedMeetings as any);
      setParticipants(participantsData as any);
      setMentors(mentorsData as any);
    } catch (error) {
      console.error('Error loading meetings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load meetings',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterMeetings = () => {
    let filtered = meetings;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(m => 
        m.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.advisorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.notes?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Student filter
    if (studentFilter !== 'all') {
      filtered = filtered.filter(m => m.studentId === studentFilter);
    }

    // Advisor filter
    if (advisorFilter !== 'all') {
      filtered = filtered.filter(m => m.advisorId === advisorFilter);
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (dateFilter) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          filtered = filtered.filter(m => {
            const meetingDate = new Date(m.meetingDate);
            return meetingDate >= filterDate && meetingDate < new Date(filterDate.getTime() + 24 * 60 * 60 * 1000);
          });
          break;
        case 'week':
          filterDate.setDate(filterDate.getDate() - 7);
          filtered = filtered.filter(m => new Date(m.meetingDate) >= filterDate);
          break;
        case 'month':
          filterDate.setMonth(filterDate.getMonth() - 1);
          filtered = filtered.filter(m => new Date(m.meetingDate) >= filterDate);
          break;
      }
    }

    setFilteredMeetings(filtered);
  };

  const handleDelete = (meeting: MeetingRecord) => {
    setMeetingToDelete(meeting);
    setIsDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!meetingToDelete) return;

    try {
      const result = await deleteMeeting(meetingToDelete.id);
      if (result.success) {
        toast({
          title: 'Meeting Deleted',
          description: 'Meeting record has been removed.',
        });
        loadData();
        onRefresh?.();
      } else {
        throw new Error(result.error || 'Failed to delete meeting');
      }
    } catch (error) {
      console.error('Error deleting meeting:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete meeting',
        variant: 'destructive',
      });
    } finally {
      setIsDeleteOpen(false);
      setMeetingToDelete(null);
    }
  };

  const handleFormSuccess = () => {
    loadData();
    onRefresh?.();
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return 'Not specified';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Meeting Records</CardTitle>
          <CardDescription>Loading meetings...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Meeting Records ({filteredMeetings.length})
              </CardTitle>
              <CardDescription>
                Track and manage mentor-student meetings
              </CardDescription>
            </div>
            <Button onClick={() => setIsFormOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Record Meeting
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search meetings..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={studentFilter} onValueChange={setStudentFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="All Students" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Students</SelectItem>
                {participants.map(participant => (
                  <SelectItem key={participant.id} value={participant.id}>
                    {participant.youthParticipant}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={advisorFilter} onValueChange={setAdvisorFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="All Mentors" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Mentors</SelectItem>
                {mentors.map(mentor => (
                  <SelectItem key={mentor.id} value={mentor.id}>
                    {mentor.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-full sm:w-32">
                <SelectValue placeholder="All Time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Mentor</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Topics</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMeetings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No meetings found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMeetings.map((meeting) => (
                    <TableRow key={meeting.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{meeting.studentName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <GraduationCap className="h-4 w-4 text-muted-foreground" />
                          <span>{meeting.advisorName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{formatDate(meeting.meetingDate)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{formatDuration(meeting.duration)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {meeting.topics?.slice(0, 2).map((topic, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {topic}
                            </Badge>
                          ))}
                          {meeting.topics && meeting.topics.length > 2 && (
                            <Badge variant="secondary" className="text-xs">
                              +{meeting.topics.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs truncate">
                          {meeting.notes ? (
                            <span className="text-sm">{meeting.notes}</span>
                          ) : (
                            <span className="text-muted-foreground text-sm">No notes</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => window.open(`/meeting/${meeting.id}`, '_blank')}>
                              <FileText className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => window.open(`/meeting/${meeting.id}/export`, '_blank')}>
                              <Download className="mr-2 h-4 w-4" />
                              Export
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleDelete(meeting)}
                              className="text-destructive"
                            >
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Forms and Modals */}
      <MeetingForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={handleFormSuccess}
      />

      {/* Delete Confirmation */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Meeting Record</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this meeting record? 
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
