'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Loader2, CalendarIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { createMeetingRequest } from '@/app/youth-empowerment/meeting-actions';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

// URL validation helper
function isValidUrl(string: string): boolean {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

interface MeetingRequestFormProps {
  participantId: string;
  participantUserId: string;
  participantName: string;
  participantEmail: string;
  mentorId: string;
  mentorUserId: string;
  mentorName: string;
  mentorEmail: string;
  requestedBy: 'participant' | 'mentor';
  onSuccess?: () => void;
}

export function MeetingRequestForm({
  participantId,
  participantUserId,
  participantName,
  participantEmail,
  mentorId,
  mentorUserId,
  mentorName,
  mentorEmail,
  requestedBy,
  onSuccess,
}: MeetingRequestFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState<Date>();
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState<string>('60');
  const [location, setLocation] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !date || !time) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    // Validate date is not in the past (using EST timezone)
    const selectedDateTime = new Date(date);
    const [hours, minutes] = time.split(':').map(Number);
    selectedDateTime.setHours(hours, minutes, 0, 0);
    
    // Add buffer of 15 minutes to prevent immediate scheduling
    const now = new Date();
    const bufferTime = new Date(now.getTime() + (15 * 60 * 1000)); // 15 minutes from now
    
    if (selectedDateTime < bufferTime) {
      toast({
        title: 'Error',
        description: 'Please select a date and time at least 15 minutes in the future',
        variant: 'destructive',
      });
      return;
    }

    // Validate meeting link format if provided
    if (meetingLink.trim() && !isValidUrl(meetingLink.trim())) {
      toast({
        title: 'Error',
        description: 'Please enter a valid meeting link (e.g., https://zoom.us/j/...)',
        variant: 'destructive',
      });
      return;
    }

    // Validate duration is reasonable (15 minutes to 8 hours)
    const durationMinutes = parseInt(duration);
    if (durationMinutes < 15 || durationMinutes > 480) {
      toast({
        title: 'Error',
        description: 'Meeting duration must be between 15 minutes and 8 hours',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const dateStr = format(date, 'yyyy-MM-dd');
      const result = await createMeetingRequest({
        participantId,
        participantUserId,
        participantName,
        participantEmail,
        mentorId,
        mentorUserId,
        mentorName,
        mentorEmail,
        requestedBy,
        title: title.trim(),
        description: description.trim() || undefined,
        proposedDate: dateStr,
        proposedTime: time,
        duration: parseInt(duration),
        location: location.trim() || undefined,
        meetingLink: meetingLink.trim() || undefined,
      });

      if (result.success) {
        toast({
          title: 'Meeting Request Sent',
          description: `Your meeting request has been sent to ${requestedBy === 'participant' ? mentorName : participantName}`,
        });
        setTitle('');
        setDescription('');
        setDate(undefined);
        setTime('');
        setDuration('60');
        setLocation('');
        setMeetingLink('');
        onSuccess?.();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to create meeting request',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error creating meeting request:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="title">Meeting Title *</Label>
        <Input
          id="title"
          placeholder="e.g., Project Planning Session"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
          disabled={submitting}
          required
        />
      </div>

      <div>
        <Label htmlFor="description">Description (Optional)</Label>
        <Textarea
          id="description"
          placeholder="What will be discussed in this meeting?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          maxLength={1000}
          disabled={submitting}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Date *</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !date && 'text-muted-foreground'
                )}
                disabled={submitting}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, 'PPP') : 'Pick a date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                disabled={(date) => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  return date < today;
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div>
          <Label htmlFor="time">Time *</Label>
          <Input
            id="time"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            disabled={submitting}
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="duration">Duration</Label>
        <Select value={duration} onValueChange={setDuration} disabled={submitting}>
          <SelectTrigger id="duration">
            <SelectValue placeholder="Select duration" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="30">30 minutes</SelectItem>
            <SelectItem value="60">1 hour</SelectItem>
            <SelectItem value="90">1.5 hours</SelectItem>
            <SelectItem value="120">2 hours</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="location">Location (Optional)</Label>
        <Input
          id="location"
          placeholder="e.g., Virtual, Office Room 101"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          maxLength={200}
          disabled={submitting}
        />
      </div>

      <div>
        <Label htmlFor="meetingLink">Meeting Link (Optional)</Label>
        <Input
          id="meetingLink"
          type="url"
          placeholder="https://zoom.us/j/..."
          value={meetingLink}
          onChange={(e) => setMeetingLink(e.target.value)}
          disabled={submitting}
        />
      </div>

      <Button type="submit" disabled={submitting || !title.trim() || !date || !time} className="w-full">
        {submitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Sending Request...
          </>
        ) : (
          'Send Meeting Request'
        )}
      </Button>
    </form>
  );
}

