'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, MessageSquare, Send } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { YEPParticipant, YEPMentor } from '@/lib/youth-empowerment';
import { useMessaging } from '@/hooks/use-messaging';
import { MessagingContact } from '@/types/messaging';
import { ConversationList } from './messages/conversation-list';
import { MessagesView } from './messages/messages-view';
import { ContactSelector } from './messages/contact-selector';
import { MessageComposerModal } from './messages/message-composer-modal';

interface ProfileMessagesProps {
  profile: YEPParticipant | YEPMentor;
  role: 'participant' | 'mentor';
}

export function ProfileMessages({ profile, role }: ProfileMessagesProps) {
  const { user } = useAuth();
  const [showComposer, setShowComposer] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState<MessagingContact | null>(null);

  // Use custom hook for messaging functionality (must be called unconditionally)
  const {
    loading,
    conversations,
    selectedConversation,
    messages,
    availableContacts,
    handleSelectConversation,
    handleMessageSent
  } = useMessaging(user?.uid || '', role, profile.id);

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

  // Memoized handlers to prevent unnecessary re-renders
  const handleNewMessage = useCallback((contact: MessagingContact) => {
    if (!contact.userId) {
      return;
    }
    setSelectedRecipient(contact);
    handleSelectConversation(contact.userId);
    setShowComposer(true);
  }, [handleSelectConversation]);

  const handleConversationSelect = useCallback((otherUserId: string) => {
    handleSelectConversation(otherUserId);
    setShowComposer(false);
  }, [handleSelectConversation]);

  const currentConversation = conversations.find(c => c.otherUserId === selectedConversation);
  const contactForConversation = availableContacts.find(c => c.userId === selectedConversation);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Messages
              </CardTitle>
              <CardDescription>
                {role === 'participant' 
                  ? 'Communicate with your assigned mentor'
                  : 'Communicate with your assigned participants'}
              </CardDescription>
            </div>
            {availableContacts.length > 0 && !showComposer && (
              <Button onClick={() => {
                if (availableContacts.length === 1) {
                  handleNewMessage(availableContacts[0]);
                } else {
                  setShowComposer(true);
                }
              }}>
                <Send className="mr-2 h-4 w-4" />
                New Message
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Contact Selector */}
      {showComposer && !selectedRecipient && availableContacts.length > 1 && (
        <ContactSelector
          contacts={availableContacts}
          onSelectContact={handleNewMessage}
          onCancel={() => setShowComposer(false)}
          role={role}
        />
      )}

      {/* Message Composer Modal */}
      {showComposer && selectedRecipient && (
        <MessageComposerModal
          selectedRecipient={selectedRecipient}
          onClose={() => {
            setShowComposer(false);
            setSelectedRecipient(null);
          }}
          onMessageSent={handleMessageSent}
          senderId={user.uid}
          senderRole={role}
          senderName={role === 'participant' ? (profile as YEPParticipant).youthParticipant : (profile as YEPMentor).name}
        />
      )}

      {/* Main Messages Interface */}
      {!showComposer && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <ConversationList
            conversations={conversations}
            selectedConversation={selectedConversation}
            onSelectConversation={handleConversationSelect}
            availableContacts={availableContacts}
            onNewMessage={handleNewMessage}
            role={role}
          />
          
          <MessagesView
            selectedConversation={selectedConversation}
            currentConversation={currentConversation}
            messages={messages}
            currentUserId={user.uid}
            currentUserRole={role}
            profile={profile}
            contactForConversation={contactForConversation}
            onMessageSent={handleMessageSent}
          />
        </div>
      )}
    </div>
  );
}

