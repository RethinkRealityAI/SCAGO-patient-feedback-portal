import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { getInbox, getConversation, markMessageAsRead, getMessagingContacts } from '@/app/youth-empowerment/messaging-actions';
import { ConversationSummary, MessagingContact, ConversationMessage } from '@/types/messaging';
import { YEPMessage } from '@/lib/youth-empowerment';

/**
 * Custom hook for managing messaging functionality
 * @param userId - The current user's ID
 * @param role - The user's role (participant or mentor)
 * @param profileId - The profile ID for loading contacts
 * @returns Object containing messaging state and handlers
 */
export function useMessaging(userId: string, role: 'participant' | 'mentor', profileId: string) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [availableContacts, setAvailableContacts] = useState<MessagingContact[]>([]);
  const isMountedRef = useRef(true);

  const loadInbox = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const result = await getInbox(userId);
      if (result.success && result.conversations) {
        setConversations(result.conversations);
      } else if (result.error) {
        console.error('Error loading inbox:', result.error);
        toast({
          title: 'Error',
          description: 'Failed to load messages. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error loading inbox:', error);
      toast({
        title: 'Error',
        description: 'Failed to load messages. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [userId, toast]);

  const loadAvailableContacts = useCallback(async () => {
    if (!userId) return;
    try {
      const result = await getMessagingContacts(userId, role, profileId);
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

  const loadConversation = useCallback(async (otherUserId: string) => {
    if (!userId) return;
    try {
      const result = await getConversation(userId, otherUserId);
      if (result.success && result.messages && isMountedRef.current) {
        const conversationMessages: ConversationMessage[] = result.messages.map((msg: YEPMessage) => ({
          id: msg.id,
          senderId: msg.senderId,
          senderName: msg.senderName,
          subject: msg.subject,
          content: msg.content,
          createdAt: msg.createdAt,
          read: msg.read,
          recipientId: msg.recipientId,
        }));
        setMessages(conversationMessages);
        // Mark messages as read
        const unreadMessages = result.messages.filter((msg: YEPMessage) => !msg.read && msg.recipientId === userId);
        for (const message of unreadMessages) {
          await markMessageAsRead(message.id, userId);
        }
        // Refresh inbox to update unread counts (don't await to avoid blocking)
        loadInbox().catch(console.error);
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
      if (isMountedRef.current) {
        toast({
          title: 'Error',
          description: 'Failed to load conversation. Please try again.',
          variant: 'destructive',
        });
      }
    }
  }, [userId, loadInbox, toast, isMountedRef]);

  const handleSelectConversation = useCallback((otherUserId: string) => {
    setSelectedConversation(otherUserId);
  }, []);

  const handleMessageSent = useCallback(() => {
    if (selectedConversation) {
      loadConversation(selectedConversation);
    }
    loadInbox();
  }, [selectedConversation, loadConversation, loadInbox]);

  useEffect(() => {
    isMountedRef.current = true;
    if (userId) {
      loadInbox();
      loadAvailableContacts();
    }
    return () => {
      isMountedRef.current = false;
    };
  }, [userId, loadInbox, loadAvailableContacts]);

  useEffect(() => {
    if (selectedConversation && userId && isMountedRef.current) {
      loadConversation(selectedConversation);
    }
  }, [selectedConversation, userId, loadConversation]);

  return {
    loading,
    conversations,
    selectedConversation,
    messages,
    availableContacts,
    handleSelectConversation,
    handleMessageSent,
    loadInbox,
    loadAvailableContacts,
    loadConversation
  };
}
