'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MeetingRequestForm } from '../meeting-request-form';
import { MessagingContact } from '@/types/messaging';

interface MeetingRequestModalProps {
  isOpen: boolean;
  selectedContact: MessagingContact | null;
  availableContacts: MessagingContact[];
  onSelectContact: (contact: MessagingContact) => void;
  onClose: () => void;
  onSuccess: () => void;
  participantId: string;
  participantUserId: string;
  participantName: string;
  participantEmail: string;
  mentorId: string;
  mentorUserId: string;
  mentorName: string;
  mentorEmail: string;
  requestedBy: 'participant' | 'mentor';
}

export function MeetingRequestModal({
  isOpen,
  selectedContact,
  availableContacts,
  onSelectContact,
  onClose,
  onSuccess,
  participantId,
  participantUserId,
  participantName,
  participantEmail,
  mentorId,
  mentorUserId,
  mentorName,
  mentorEmail,
  requestedBy
}: MeetingRequestModalProps) {
  if (!isOpen) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Request New Meeting</CardTitle>
        <CardDescription>
          {selectedContact 
            ? `Request a meeting with ${selectedContact.name}`
            : requestedBy === 'participant' 
              ? 'Request a meeting with your mentor'
              : 'Select a participant to request a meeting'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {selectedContact ? (
          <MeetingRequestForm
            participantId={participantId}
            participantUserId={participantUserId}
            participantName={participantName}
            participantEmail={participantEmail}
            mentorId={mentorId}
            mentorUserId={mentorUserId}
            mentorName={mentorName}
            mentorEmail={mentorEmail}
            requestedBy={requestedBy}
            onSuccess={onSuccess}
          />
        ) : (
          <div className="space-y-2">
            {availableContacts.map((contact) => (
              <Button
                key={contact.id}
                variant="outline"
                className="w-full justify-start"
                onClick={() => onSelectContact(contact)}
              >
                {contact.name}
              </Button>
            ))}
            <Button variant="ghost" onClick={onClose} className="w-full mt-4">
              Cancel
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
