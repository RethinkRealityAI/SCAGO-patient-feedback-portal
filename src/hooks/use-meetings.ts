import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { getUserMeetings, getPendingMeetingRequests, getMeetingContacts } from '@/app/youth-empowerment/meeting-actions';
import { YEPMeeting } from '@/lib/youth-empowerment';
import { MessagingContact } from '@/types/messaging';

/**
 * Custom hook for managing meetings functionality
 * @param userId - The current user's ID
 * @param role - The user's role (participant or mentor)
 * @param profileId - The profile ID for loading contacts
 * @returns Object containing meetings state and handlers
 */
export function useMeetings(userId: string, role: 'participant' | 'mentor', profileId: string) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [meetings, setMeetings] = useState<YEPMeeting[]>([]);
  const [pendingMeetings, setPendingMeetings] = useState<YEPMeeting[]>([]);
  const [availableContacts, setAvailableContacts] = useState<MessagingContact[]>([]);
  const isMountedRef = useRef(true);

  const loadMeetings = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const [allMeetingsResult, pendingResult] = await Promise.all([
        getUserMeetings(userId),
        role === 'mentor' ? getPendingMeetingRequests(userId) : Promise.resolve({ success: true, meetings: [] }),
      ]);

      if (allMeetingsResult.success && allMeetingsResult.meetings) {
        setMeetings(allMeetingsResult.meetings);
      } else if (allMeetingsResult.error) {
        console.error('Error loading meetings:', allMeetingsResult.error);
        toast({
          title: 'Error',
          description: 'Failed to load meetings. Please try again.',
          variant: 'destructive',
        });
      }

      if (pendingResult.success && pendingResult.meetings) {
        setPendingMeetings(pendingResult.meetings);
      } else if (!pendingResult.success && role === 'mentor') {
        const err = (pendingResult as any).error;
        console.error('Error loading pending meetings:', err);
        toast({
          title: 'Error',
          description: 'Failed to load pending meetings. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error loading meetings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load meetings. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [userId, role, toast]);

  const loadAvailableContacts = useCallback(async () => {
    if (!userId) return;
    try {
      const result = await getMeetingContacts(userId, role, profileId);
      if (result.success && result.contacts) {
        setAvailableContacts(result.contacts);
      } else if (result.error) {
        console.error('Error loading contacts:', result.error);
        toast({
          title: 'Error',
          description: 'Failed to load contacts. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error loading contacts:', error);
      toast({
        title: 'Error',
        description: 'Failed to load contacts. Please try again.',
        variant: 'destructive',
      });
    }
  }, [userId, role, profileId, toast]);

  const handleMeetingUpdated = useCallback(() => {
    loadMeetings();
    toast({
      title: 'Success',
      description: 'Meeting request has been sent successfully.',
    });
  }, [loadMeetings, toast]);

  useEffect(() => {
    isMountedRef.current = true;
    if (userId) {
      loadMeetings();
      loadAvailableContacts();
    }
    return () => {
      isMountedRef.current = false;
    };
  }, [userId, loadMeetings, loadAvailableContacts]);

  return {
    loading,
    meetings,
    pendingMeetings,
    availableContacts,
    handleMeetingUpdated,
    loadMeetings,
    loadAvailableContacts
  };
}
