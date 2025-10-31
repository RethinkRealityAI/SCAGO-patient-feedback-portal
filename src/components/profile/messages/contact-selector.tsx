'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { MessagingContact } from '@/types/messaging';

interface ContactSelectorProps {
  contacts: MessagingContact[];
  onSelectContact: (contact: MessagingContact) => void;
  onCancel: () => void;
  role: 'participant' | 'mentor';
}

export function ContactSelector({
  contacts,
  onSelectContact,
  onCancel,
  role
}: ContactSelectorProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <CardTitle>Select Recipient</CardTitle>
        </div>
        <CardDescription>
          {role === 'participant' 
            ? 'Select a mentor to message'
            : 'Select a participant to message'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {contacts.map((contact) => (
            <Button
              key={contact.id}
              variant="outline"
              className="w-full justify-start"
              onClick={() => onSelectContact(contact)}
              disabled={!contact.userId}
            >
              {contact.name}
              {!contact.userId && (
                <span className="ml-2 text-xs text-muted-foreground">(Not available)</span>
              )}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
