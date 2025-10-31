'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { sendMessage } from '@/app/youth-empowerment/messaging-actions';

interface MessageComposerProps {
  senderId: string;
  senderRole: 'participant' | 'mentor';
  senderName: string;
  recipientId: string;
  recipientRole: 'participant' | 'mentor';
  recipientName: string;
  recipientEmail: string;
  onSent?: () => void;
}

export function MessageComposer({
  senderId,
  senderRole,
  senderName,
  recipientId,
  recipientRole,
  recipientName,
  recipientEmail,
  onSent,
}: MessageComposerProps) {
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!subject.trim() || !content.trim()) {
      toast({
        title: 'Error',
        description: 'Please fill in both subject and message',
        variant: 'destructive',
      });
      return;
    }

    setSending(true);
    try {
      const result = await sendMessage({
        senderId,
        senderRole,
        senderName,
        recipientId,
        recipientRole,
        recipientName,
        recipientEmail,
        subject: subject.trim(),
        content: content.trim(),
      });

      if (result.success) {
        toast({
          title: 'Message Sent',
          description: `Your message has been sent to ${recipientName}`,
        });
        setSubject('');
        setContent('');
        onSent?.();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to send message',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Input
          placeholder="Subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          maxLength={200}
          disabled={sending}
          required
        />
        <p className="text-xs text-muted-foreground mt-1">{subject.length}/200</p>
      </div>

      <div>
        <Textarea
          placeholder={`Type your message to ${recipientName}...`}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={6}
          maxLength={5000}
          disabled={sending}
          required
        />
        <p className="text-xs text-muted-foreground mt-1">{content.length}/5000</p>
      </div>

      <Button type="submit" disabled={sending || !subject.trim() || !content.trim()} className="w-full">
        {sending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Sending...
          </>
        ) : (
          <>
            <Send className="mr-2 h-4 w-4" />
            Send Message
          </>
        )}
      </Button>
    </form>
  );
}

