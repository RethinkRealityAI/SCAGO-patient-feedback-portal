'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageSquare } from 'lucide-react';
import { ConversationSummary, MessagingContact } from '@/types/messaging';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

/**
 * Props for the ConversationList component
 */
interface ConversationListProps {
  conversations: ConversationSummary[];
  selectedConversation: string | null;
  onSelectConversation: (otherUserId: string) => void;
  availableContacts: MessagingContact[];
  onNewMessage: (contact: MessagingContact) => void;
  role: 'participant' | 'mentor';
}

/**
 * Component for displaying the list of conversations
 * @param props - The component props
 * @returns JSX element
 */
export function ConversationList({
  conversations,
  selectedConversation,
  onSelectConversation,
  availableContacts,
  onNewMessage,
  role
}: ConversationListProps) {
  return (
    <Card className="lg:col-span-1">
      <CardHeader>
        <CardTitle className="text-lg">Conversations</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {conversations.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No conversations yet</p>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => {
                        if (availableContacts.length > 0) {
                          onNewMessage(availableContacts[0]);
                        }
                      }}
                      disabled={availableContacts.length === 0}
                    >
                      Start a conversation
                    </Button>
                  </span>
                </TooltipTrigger>
                {availableContacts.length === 0 && (
                  <TooltipContent>
                    <p>
                      {role === 'participant'
                        ? 'A mentor must be linked to your profile before you can send messages.'
                        : 'You need assigned participants before you can send messages.'}
                    </p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </div>
        ) : (
          <div className="divide-y">
            {conversations.map((conv) => (
              <button
                key={conv.otherUserId}
                onClick={() => onSelectConversation(conv.otherUserId)}
                className={`w-full p-4 text-left hover:bg-muted/50 transition-colors ${
                  selectedConversation === conv.otherUserId ? 'bg-muted' : ''
                }`}
                aria-label={`Select conversation with ${conv.otherUserName}`}
                aria-pressed={selectedConversation === conv.otherUserId}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{conv.otherUserName}</p>
                    {conv.lastMessage && (
                      <p className="text-sm text-muted-foreground truncate mt-1">
                        {conv.lastMessage.subject}
                      </p>
                    )}
                  </div>
                  {conv.unreadCount > 0 && (
                    <Badge variant="default" className="ml-2">
                      {conv.unreadCount}
                    </Badge>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
