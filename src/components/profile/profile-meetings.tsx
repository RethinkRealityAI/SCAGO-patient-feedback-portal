'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Calendar, Plus, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { useAuth } from '@/hooks/use-auth';
import { YEPParticipant, YEPMentor } from '@/lib/youth-empowerment';
import { MessagingContact } from '@/types/messaging';
import { useMeetings } from '@/hooks/use-meetings';
import { MeetingTabs } from './meetings/meeting-tabs';
import { MeetingRequestModal } from './meetings/meeting-request-modal';

interface ProfileMeetingsProps {
  profile: YEPParticipant | YEPMentor;
  role: 'participant' | 'mentor';
}

export function ProfileMeetings({ profile, role }: ProfileMeetingsProps) {
  const { user } = useAuth();
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [selectedContact, setSelectedContact] = useState<MessagingContact | null>(null);

  // Use custom hook for meetings functionality (must be called unconditionally)
  const {
    loading,
    meetings,
    pendingMeetings,
    availableContacts,
    handleMeetingUpdated
  } = useMeetings(user?.uid || '', role, profile.id);

  // Early return if user is not available or loading
  if (!user || !user.uid || loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const handleNewMeeting = () => {
    if (availableContacts.length === 1) {
      setSelectedContact(availableContacts[0]);
      setShowRequestForm(true);
    } else {
      // Show contact selector if multiple contacts
      setShowRequestForm(true);
    }
  };

  const handleMeetingSuccess = () => {
    handleMeetingUpdated();
    setShowRequestForm(false);
    setSelectedContact(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Meetings
              </CardTitle>
              <CardDescription>
                {role === 'participant' 
                  ? 'Schedule and manage meetings with your mentor'
                  : 'Schedule and manage meetings with your participants'}
              </CardDescription>
            </div>
            {!showRequestForm && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button onClick={handleNewMeeting} disabled={availableContacts.length === 0}>
                        <Plus className="mr-2 h-4 w-4" />
                        Request Meeting
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {availableContacts.length === 0 && (
                    <TooltipContent>
                      <p>
                        {role === 'participant'
                          ? 'A mentor must be linked to your profile before you can request a meeting.'
                          : 'You need assigned participants before you can request a meeting.'}
                      </p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Guidance when no contacts are available */}
      {availableContacts.length === 0 && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            {role === 'participant'
              ? "You can request a meeting once a mentor is linked to your profile. If you have been linked and still don't have access, please contact support at tech@sicklecellanemia.ca."
              : 'You can request meetings after participants are assigned to you. If you need access, please contact your program administrator.'}
          </AlertDescription>
        </Alert>
      )}

      {/* Meeting Request Modal */}
      <MeetingRequestModal
        isOpen={showRequestForm}
        selectedContact={selectedContact}
        availableContacts={availableContacts}
        onSelectContact={setSelectedContact}
        onClose={() => setShowRequestForm(false)}
        onSuccess={handleMeetingSuccess}
        participantId={role === 'participant' ? profile.id : (selectedContact?.id || '')}
        participantUserId={role === 'participant' ? user.uid : (selectedContact?.userId || '')}
        participantName={role === 'participant' ? (profile as YEPParticipant).youthParticipant : (selectedContact?.name || '')}
        participantEmail={role === 'participant' ? ((profile as YEPParticipant).email || (profile as YEPParticipant).authEmail || '') : (selectedContact?.email || '')}
        mentorId={role === 'mentor' ? profile.id : (selectedContact?.id || '')}
        mentorUserId={role === 'mentor' ? user.uid : (selectedContact?.userId || '')}
        mentorName={role === 'mentor' ? (profile as YEPMentor).name : (selectedContact?.name || '')}
        mentorEmail={role === 'mentor' ? ((profile as YEPMentor).email || (profile as YEPMentor).authEmail || '') : (selectedContact?.email || '')}
        requestedBy={role}
      />

      {/* Meetings Tabs */}
      {!showRequestForm && (
        <MeetingTabs
          meetings={meetings}
          pendingMeetings={pendingMeetings}
          currentUserId={user.uid}
          currentUserRole={role}
          onUpdate={handleMeetingSuccess}
          onNewMeeting={handleNewMeeting}
          availableContacts={availableContacts}
        />
      )}
    </div>
  );
}

