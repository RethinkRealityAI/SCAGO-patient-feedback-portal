'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { getUnreadCount } from '@/app/youth-empowerment/messaging-actions';
import { getPendingMeetingRequests } from '@/app/youth-empowerment/meeting-actions';

export function useNotifications() {
  const { user } = useAuth();
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [pendingMeetings, setPendingMeetings] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setUnreadMessages(0);
      setPendingMeetings(0);
      setLoading(false);
      return;
    }

    const loadNotifications = async () => {
      try {
        const [messagesResult, meetingsResult] = await Promise.all([
          getUnreadCount(user.uid),
          getPendingMeetingRequests(user.uid),
        ]);

        if (messagesResult.success) {
          setUnreadMessages(messagesResult.count || 0);
        }

        if (meetingsResult.success) {
          setPendingMeetings(meetingsResult.meetings?.length || 0);
        }
      } catch (error) {
        console.error('Error loading notifications:', error);
      } finally {
        setLoading(false);
      }
    };

    loadNotifications();

    // Refresh every 30 seconds
    const interval = setInterval(loadNotifications, 30000);

    // Refresh on window focus
    const handleFocus = () => {
      loadNotifications();
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [user]);

  return {
    unreadMessages,
    pendingMeetings,
    loading,
    refresh: async () => {
      if (!user) return;
      const [messagesResult, meetingsResult] = await Promise.all([
        getUnreadCount(user.uid),
        getPendingMeetingRequests(user.uid),
      ]);
      if (messagesResult.success) {
        setUnreadMessages(messagesResult.count || 0);
      }
      if (meetingsResult.success) {
        setPendingMeetings(meetingsResult.meetings?.length || 0);
      }
    },
  };
}

// Notification center types and hooks for in-app notifications
export type Notification = {
  id: string;
  title: string;
  description?: string;
  type: 'success' | 'error' | 'warning' | 'info';
  action?: { label: string; onClick: () => void };
};

// Local notification center state for dashboards and pages
export function useNotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = (notification: Omit<Notification, 'id'> & { id?: string }) => {
    const id = notification.id || String(Date.now());
    const next: Notification = { id, title: notification.title, type: notification.type, description: notification.description, action: notification.action };
    setNotifications(prev => [...prev, next]);
    return id;
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  return { notifications, addNotification, removeNotification, clearAllNotifications };
}

// Analytics-driven notifications hook (no-op placeholder to satisfy imports)
export function useAnalyticsNotifications(_submissions: unknown[]) {
  useEffect(() => {
    // Intentionally empty: analytics-driven notifications may be added later
  }, [_submissions]);
}