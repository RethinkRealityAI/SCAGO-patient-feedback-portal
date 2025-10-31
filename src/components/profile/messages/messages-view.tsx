'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { MessageComposer } from '../message-composer';
import { ConversationMessage, MessagingContact } from '@/types/messaging';
import { YEPParticipant, YEPMentor } from '@/lib/youth-empowerment';

interface MessagesViewProps {
  selectedConversation: string | null;
  currentConversation?: {
    otherUserName: string;
    otherUserRole: 'participant' | 'mentor';
  };
  messages: ConversationMessage[];
  currentUserId: string;
  currentUserRole: 'participant' | 'mentor';
  profile: YEPParticipant | YEPMentor;
  contactForConversation?: MessagingContact;
  onMessageSent: () => void;
}

export function MessagesView({
  selectedConversation,
  currentConversation,
  messages,
  currentUserId,
  currentUserRole,
  profile,
  contactForConversation,
  onMessageSent
}: MessagesViewProps) {
  if (!selectedConversation) {
    return (
      <Card className="lg:col-span-2">
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Select a conversation to view messages</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>{currentConversation?.otherUserName || 'Conversation'}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4 max-h-[500px] overflow-y-auto">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              <p>No messages yet</p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.senderId === currentUserId ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-4 ${
                    message.senderId === currentUserId
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">
                      {message.senderId === currentUserId ? 'You' : message.senderName}
                    </span>
                    <span className={`text-xs ml-2 ${
                      message.senderId === currentUserId ? 'text-primary-foreground/70' : 'text-muted-foreground'
                    }`}>
                      {format(new Date(message.createdAt), 'MMM d, h:mm a')}
                    </span>
                  </div>
                  <p className="font-medium mb-1">{message.subject}</p>
                  <p className={`text-sm ${
                    message.senderId === currentUserId ? 'text-primary-foreground/90' : ''
                  }`}>
                    {message.content}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="border-t pt-4">
          {contactForConversation?.userId ? (
            <MessageComposer
              senderId={currentUserId}
              senderRole={currentUserRole}
              senderName={currentUserRole === 'participant' ? (profile as YEPParticipant).youthParticipant : (profile as YEPMentor).name}
              recipientId={selectedConversation}
              recipientRole={currentConversation?.otherUserRole || (currentUserRole === 'participant' ? 'mentor' : 'participant')}
              recipientName={currentConversation?.otherUserName || ''}
              recipientEmail={contactForConversation?.email || ''}
              onSent={onMessageSent}
            />
          ) : (
            <div className="text-center text-muted-foreground py-4">
              <p className="text-sm">This contact is not available for messaging yet.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
