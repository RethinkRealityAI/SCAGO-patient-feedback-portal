'use client'

import React from 'react'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Notification } from '@/hooks/use-notifications'

interface NotificationSystemProps {
  notifications: Notification[]
  onRemove: (id: string) => void
  onClearAll: () => void
}

const iconMap = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
}

const colorMap = {
  success: 'border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200',
  error: 'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200',
  warning: 'border-yellow-200 bg-yellow-50 text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-200',
  info: 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200',
}

export function NotificationSystem({ notifications, onRemove, onClearAll }: NotificationSystemProps) {
  if (notifications.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 w-96 space-y-2" role="region" aria-label="Notifications" aria-live="polite">
      {notifications.length > 1 && (
        <div className="flex justify-between items-center mb-2">
          <Badge variant="secondary" className="text-xs">
            {notifications.length} notifications
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearAll}
            className="text-xs h-6"
          >
            Clear All
          </Button>
        </div>
      )}
      
      {notifications.map((notification) => {
        const Icon = iconMap[notification.type]
        const colorClass = colorMap[notification.type]
        
        return (
          <Card
            key={notification.id}
            className={`${colorClass} border shadow-lg animate-in slide-in-from-right duration-300`}
            role="alert"
            aria-labelledby={`notification-title-${notification.id}`}
            aria-describedby={notification.description ? `notification-desc-${notification.id}` : undefined}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Icon className="h-5 w-5 mt-0.5 flex-shrink-0" aria-hidden="true" />
                <div className="flex-1 min-w-0">
                  <h4 id={`notification-title-${notification.id}`} className="font-medium text-sm">
                    {notification.title}
                  </h4>
                  {notification.description && (
                    <p id={`notification-desc-${notification.id}`} className="text-sm opacity-90 mt-1">
                      {notification.description}
                    </p>
                  )}
                  {notification.action && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={notification.action.onClick}
                      className="mt-2 h-7 text-xs"
                    >
                      {notification.action.label}
                    </Button>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemove(notification.id)}
                  className="h-6 w-6 p-0 hover:bg-black/10 dark:hover:bg-white/10"
                  aria-label={`Dismiss ${notification.title} notification`}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
