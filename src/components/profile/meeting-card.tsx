'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar, Clock, MapPin, Video, CheckCircle, XCircle, X, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { approveMeeting, rejectMeeting, cancelMeeting } from '@/app/youth-empowerment/meeting-actions';
import { YEPMeeting } from '@/lib/youth-empowerment';
import { generateICSContent, downloadICS, generateGoogleCalendarURL, generateOutlookCalendarURL } from '@/lib/calendar-utils';
import { format } from 'date-fns';

interface MeetingCardProps {
  meeting: YEPMeeting;
  currentUserId: string;
  currentUserRole: 'participant' | 'mentor';
  onUpdate?: () => void;
}

export function MeetingCard({ meeting, currentUserId, onUpdate }: MeetingCardProps) {
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const canApprove = meeting.status === 'pending' && 
                     meeting.mentorUserId === currentUserId;
  const canReject = meeting.status === 'pending' && 
                    meeting.mentorUserId === currentUserId;
  const canCancel = meeting.status !== 'cancelled' && 
                    (meeting.participantUserId === currentUserId || meeting.mentorUserId === currentUserId);

  const handleApprove = async () => {
    setLoading(true);
    try {
      const result = await approveMeeting(meeting.id, currentUserId);
      if (result.success) {
        toast({
          title: 'Meeting Approved',
          description: 'The meeting has been approved',
        });
        onUpdate?.();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to approve meeting',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error approving meeting:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    setLoading(true);
    try {
      const result = await rejectMeeting(meeting.id, currentUserId, rejectionReason.trim() || undefined);
      if (result.success) {
        toast({
          title: 'Meeting Rejected',
          description: 'The meeting request has been rejected',
        });
        setRejectDialogOpen(false);
        setRejectionReason('');
        onUpdate?.();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to reject meeting',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error rejecting meeting:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    setLoading(true);
    try {
      const result = await cancelMeeting(meeting.id, currentUserId);
      if (result.success) {
        toast({
          title: 'Meeting Cancelled',
          description: 'The meeting has been cancelled',
        });
        setCancelDialogOpen(false);
        onUpdate?.();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to cancel meeting',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error cancelling meeting:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCalendar = () => {
    if (meeting.status !== 'approved') {
      toast({
        title: 'Error',
        description: 'Only approved meetings can be added to calendar',
        variant: 'destructive',
      });
      return;
    }

    // Handle both Date objects and Firestore Timestamps
    const startDate = meeting.proposedDate instanceof Date 
      ? new Date(meeting.proposedDate)
      : (meeting.proposedDate as any)?.toDate?.() || new Date(meeting.proposedDate);
    
    const [hours, minutes] = meeting.proposedTime.split(':').map(Number);
    startDate.setHours(hours, minutes, 0, 0);
    const endDate = new Date(startDate);
    endDate.setMinutes(endDate.getMinutes() + meeting.duration);

    const calendarEvent = {
      title: meeting.title,
      description: meeting.description || '',
      start: startDate,
      end: endDate,
      location: meeting.location || '',
      meetingLink: meeting.meetingLink || undefined,
      organizer: {
        name: meeting.mentorName,
        email: '',
      },
      attendees: [
        {
          name: meeting.participantName,
          email: '',
        },
      ],
    };

    const icsContent = generateICSContent(calendarEvent);
    downloadICS(icsContent, `${meeting.title.replace(/\s+/g, '-')}.ics`);
  };

  const handleAddToGoogleCalendar = () => {
    if (meeting.status !== 'approved') {
      toast({
        title: 'Error',
        description: 'Only approved meetings can be added to calendar',
        variant: 'destructive',
      });
      return;
    }

    const startDate = meeting.proposedDate instanceof Date 
      ? new Date(meeting.proposedDate)
      : (meeting.proposedDate as any)?.toDate?.() || new Date(meeting.proposedDate);
    const [hoursG, minutesG] = meeting.proposedTime.split(':').map(Number);
    startDate.setHours(hoursG, minutesG, 0, 0);
    const endDate = new Date(startDate);
    endDate.setMinutes(endDate.getMinutes() + meeting.duration);

    const url = generateGoogleCalendarURL({
      title: meeting.title,
      description: meeting.description || '',
      start: startDate,
      end: endDate,
      location: meeting.location || meeting.meetingLink || '',
    });
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleAddToOutlookCalendar = () => {
    if (meeting.status !== 'approved') {
      toast({
        title: 'Error',
        description: 'Only approved meetings can be added to calendar',
        variant: 'destructive',
      });
      return;
    }

    const startDate = meeting.proposedDate instanceof Date 
      ? new Date(meeting.proposedDate)
      : (meeting.proposedDate as any)?.toDate?.() || new Date(meeting.proposedDate);
    const [hoursO, minutesO] = meeting.proposedTime.split(':').map(Number);
    startDate.setHours(hoursO, minutesO, 0, 0);
    const endDate = new Date(startDate);
    endDate.setMinutes(endDate.getMinutes() + meeting.duration);

    const url = generateOutlookCalendarURL({
      title: meeting.title,
      description: meeting.description || '',
      start: startDate,
      end: endDate,
      location: meeting.location || meeting.meetingLink || '',
    });
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const getStatusBadge = () => {
    switch (meeting.status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">Pending</Badge>;
      case 'approved':
        return <Badge variant="default" className="bg-green-50 text-green-700 border-green-300">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-300">Cancelled</Badge>;
      default:
        return null;
    }
  };

  // Handle both Date objects and Firestore Timestamps
  const meetingDate = meeting.proposedDate instanceof Date 
    ? new Date(meeting.proposedDate)
    : (meeting.proposedDate as any)?.toDate?.() || new Date(meeting.proposedDate);
  const [hours, minutes] = meeting.proposedTime.split(':').map(Number);
  meetingDate.setHours(hours, minutes, 0, 0);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2">
                {meeting.title}
                {getStatusBadge()}
              </CardTitle>
              <CardDescription className="mt-2">
                {meeting.requestedBy === 'participant' ? 'Requested by participant' : 'Requested by mentor'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{format(meetingDate, 'PPP')}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{format(meetingDate, 'p')} ({meeting.duration} min)</span>
            </div>
            {meeting.location && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{meeting.location}</span>
              </div>
            )}
            {meeting.meetingLink && (
              <div className="flex items-center gap-2 text-sm">
                <Video className="h-4 w-4 text-muted-foreground" />
                <a href={meeting.meetingLink} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  Join Meeting
                </a>
              </div>
            )}
          </div>

          {meeting.description && (
            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-1">Description:</p>
              <p>{meeting.description}</p>
            </div>
          )}

          {meeting.status === 'rejected' && meeting.rejectionReason && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
              <p className="font-medium mb-1">Rejection Reason:</p>
              <p>{meeting.rejectionReason}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            {canApprove && (
              <Button onClick={handleApprove} disabled={loading} size="sm" className="gap-2">
                <CheckCircle className="h-4 w-4" />
                Approve
              </Button>
            )}
            {canReject && (
              <Button onClick={() => setRejectDialogOpen(true)} disabled={loading} variant="destructive" size="sm" className="gap-2">
                <XCircle className="h-4 w-4" />
                Reject
              </Button>
            )}
            {canCancel && (
              <Button onClick={() => setCancelDialogOpen(true)} disabled={loading} variant="outline" size="sm" className="gap-2">
                <X className="h-4 w-4" />
                Cancel
              </Button>
            )}
            {meeting.status === 'approved' && (
              <>
                <Button onClick={handleAddToGoogleCalendar} variant="outline" size="sm" className="gap-2">
                  <Calendar className="h-4 w-4" />
                  Add to Google
                </Button>
                <Button onClick={handleAddToOutlookCalendar} variant="outline" size="sm" className="gap-2">
                  <Calendar className="h-4 w-4" />
                  Add to Outlook
                </Button>
                <Button onClick={handleAddToCalendar} variant="outline" size="sm" className="gap-2">
                  <Download className="h-4 w-4" />
                  Download ICS
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Meeting Request</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this meeting request (optional).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="rejectionReason">Reason (Optional)</Label>
              <Textarea
                id="rejectionReason"
                placeholder="e.g., Conflict with another meeting"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleReject} variant="destructive" disabled={loading}>
              {loading ? 'Rejecting...' : 'Reject Meeting'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Meeting</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this meeting? The other party will be notified.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)} disabled={loading}>
              Keep Meeting
            </Button>
            <Button onClick={handleCancel} variant="destructive" disabled={loading}>
              {loading ? 'Cancelling...' : 'Cancel Meeting'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

