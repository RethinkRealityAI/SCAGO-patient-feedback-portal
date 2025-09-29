'use client'

import { useState, useCallback, useEffect } from 'react'

export interface Notification {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  description?: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])

  const addNotification = useCallback((notification: Omit<Notification, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 15)
    const newNotification: Notification = {
      id,
      duration: 5000, // Default 5 seconds
      ...notification,
    }

    setNotifications(prev => [...prev, newNotification])

    // Auto remove after duration
    if (newNotification.duration && newNotification.duration > 0) {
      setTimeout(() => {
        removeNotification(id)
      }, newNotification.duration)
    }

    return id
  }, [])

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  const clearAllNotifications = useCallback(() => {
    setNotifications([])
  }, [])

  return {
    notifications,
    addNotification,
    removeNotification,
    clearAllNotifications,
  }
}

// Analytics notifications
export function useAnalyticsNotifications(submissions: any[]) {
  const { addNotification } = useNotifications()

  useEffect(() => {
    if (submissions.length === 0) return
    
    // Delay to avoid hydration issues
    const timer = setTimeout(() => {
      // Check for low ratings in recent submissions
      const recentSubmissions = submissions
        .filter(s => {
          const submissionDate = new Date(s.submittedAt)
          const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
          return submissionDate >= oneDayAgo
        })

      const lowRatings = recentSubmissions.filter(s => s.rating < 5)
      
      if (lowRatings.length > 0) {
        addNotification({
          type: 'warning',
          title: 'Low Rating Alert',
          description: `${lowRatings.length} submission(s) with ratings below 5 in the last 24 hours`,
          duration: 10000,
        })
      }

      // Check for high volume of submissions
      if (recentSubmissions.length > 10) {
        addNotification({
          type: 'info',
          title: 'High Activity',
          description: `${recentSubmissions.length} new submissions in the last 24 hours`,
          duration: 7000,
        })
      }

      // Check for excellent ratings
      const excellentRatings = recentSubmissions.filter(s => s.rating >= 9)
      if (excellentRatings.length >= 3) {
        addNotification({
          type: 'success',
          title: 'Excellent Feedback',
          description: `${excellentRatings.length} submissions with 9+ ratings today!`,
          duration: 8000,
        })
      }
    }, 1000) // 1 second delay
    
    return () => clearTimeout(timer)
  }, [submissions, addNotification])
}
