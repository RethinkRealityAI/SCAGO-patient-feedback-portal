/**
 * Shared types for messaging and profile features
 */

export interface MessagingContact {
  id: string;
  userId?: string;
  name: string;
  email?: string;
  role: 'participant' | 'mentor';
}

export interface ConversationSummary {
  otherUserId: string;
  otherUserName: string;
  otherUserRole: 'participant' | 'mentor';
  lastMessage?: {
    subject: string;
    createdAt: Date;
  };
  unreadCount: number;
}

export interface ConversationMessage {
  id: string;
  senderId: string;
  senderName: string;
  subject: string;
  content: string;
  createdAt: Date;
  read?: boolean;
  recipientId?: string;
}










