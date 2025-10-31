'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { MessageComposer } from '../message-composer';
import { MessagingContact } from '@/types/messaging';

interface MessageComposerModalProps {
  selectedRecipient: MessagingContact | null;
  onClose: () => void;
  onMessageSent: () => void;
  senderId: string;
  senderRole: 'participant' | 'mentor';
  senderName: string;
}

export function MessageComposerModal({
  selectedRecipient,
  onClose,
  onMessageSent,
  senderId,
  senderRole,
  senderName
}: MessageComposerModalProps) {
  if (!selectedRecipient) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <CardTitle>New Message to {selectedRecipient.name}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {selectedRecipient.userId ? (
          <MessageComposer
            senderId={senderId}
            senderRole={senderRole}
            senderName={senderName}
            recipientId={selectedRecipient.userId}
            recipientRole={selectedRecipient.role}
            recipientName={selectedRecipient.name}
            recipientEmail={selectedRecipient.email || ''}
            onSent={() => {
              onMessageSent();
              onClose();
            }}
          />
        ) : (
          <div className="text-center text-muted-foreground py-8">
            <p>This contact is not available for messaging yet.</p>
            <p className="text-sm mt-2">They need to claim their profile first.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
