'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Plus } from 'lucide-react';
import { MeetingCard } from '../meeting-card';
import { YEPMeeting } from '@/lib/youth-empowerment';
import { MessagingContact } from '@/types/messaging';

interface MeetingTabsProps {
  meetings: YEPMeeting[];
  pendingMeetings: YEPMeeting[];
  currentUserId: string;
  currentUserRole: 'participant' | 'mentor';
  onUpdate: () => void;
  onNewMeeting: () => void;
  availableContacts: MessagingContact[];
}

export function MeetingTabs({
  meetings,
  pendingMeetings,
  currentUserId,
  currentUserRole,
  onUpdate,
  onNewMeeting,
  availableContacts
}: MeetingTabsProps) {
  const approvedMeetings = meetings.filter(m => m.status === 'approved');
  const pendingMeetingsList = meetings.filter(m => m.status === 'pending');

  const renderMeetingList = (meetingList: YEPMeeting[], emptyMessage: string, emptyIcon: React.ReactNode) => {
    if (meetingList.length === 0) {
      return (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            {emptyIcon}
            <p className="text-muted-foreground mt-4">{emptyMessage}</p>
            {availableContacts.length > 0 && meetingList === meetings && (
              <Button onClick={onNewMeeting} className="mt-4">
                <Plus className="mr-2 h-4 w-4" />
                Request Meeting
              </Button>
            )}
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-4">
        {meetingList.map((meeting) => (
          <MeetingCard
            key={meeting.id}
            meeting={meeting}
            currentUserId={currentUserId}
            currentUserRole={currentUserRole}
            onUpdate={onUpdate}
          />
        ))}
      </div>
    );
  };

  return (
    <Tabs defaultValue="all" className="space-y-4">
      <TabsList>
        <TabsTrigger value="all">All Meetings</TabsTrigger>
        {currentUserRole === 'mentor' && pendingMeetings.length > 0 && (
          <TabsTrigger value="pending">
            Pending ({pendingMeetings.length})
          </TabsTrigger>
        )}
        <TabsTrigger value="approved">Approved ({approvedMeetings.length})</TabsTrigger>
        {pendingMeetingsList.length > 0 && (
          <TabsTrigger value="pending-requests">
            My Requests ({pendingMeetingsList.length})
          </TabsTrigger>
        )}
      </TabsList>

      <TabsContent value="all" className="space-y-4">
        {renderMeetingList(
          meetings,
          'No meetings scheduled',
          <Calendar className="h-12 w-12 text-muted-foreground opacity-50" />
        )}
      </TabsContent>

      {currentUserRole === 'mentor' && (
        <TabsContent value="pending" className="space-y-4">
          {renderMeetingList(
            pendingMeetings,
            'No pending meeting requests',
            <Clock className="h-12 w-12 text-muted-foreground opacity-50" />
          )}
        </TabsContent>
      )}

      <TabsContent value="approved" className="space-y-4">
        {renderMeetingList(
          approvedMeetings,
          'No approved meetings',
          <Calendar className="h-12 w-12 text-muted-foreground opacity-50" />
        )}
      </TabsContent>

      <TabsContent value="pending-requests" className="space-y-4">
        {renderMeetingList(
          pendingMeetingsList,
          'No pending requests',
          <Clock className="h-12 w-12 text-muted-foreground opacity-50" />
        )}
      </TabsContent>
    </Tabs>
  );
}
