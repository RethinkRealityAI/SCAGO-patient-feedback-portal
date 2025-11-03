'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
// Firestore imports removed - now using utility functions from @/lib/submission-utils
import { Activity, UserPlus, FileEdit, Trash2 } from 'lucide-react';

interface ActivityItem {
  id: string;
  type: string;
  description: string;
  timestamp: Date;
  user?: string;
}

export function ActivityLog() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActivities();
  }, []);

  const loadActivities = async () => {
    try {
      // Get recent feedback submissions from both new structure and legacy collection
      const { fetchAllSubmissions } = await import('@/lib/submission-utils');
      const allSubmissions = await fetchAllSubmissions();
      
      // Sort by submittedAt descending and take first 20
      const recentSubmissions = allSubmissions
        .sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime())
        .slice(0, 20);
      
      const activities: ActivityItem[] = recentSubmissions.map(sub => ({
        id: sub.id,
        type: 'submission' as const,
        description: `New feedback submission${sub.surveyId ? ` for survey ${sub.surveyId}` : ''}`,
        timestamp: sub.submittedAt instanceof Date ? sub.submittedAt : new Date(sub.submittedAt),
        user: (sub as any).email || 'Anonymous',
      }));

      setActivities(activities);
    } catch (error) {
      console.error('Error loading activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'submission':
        return <FileEdit className="h-4 w-4 text-blue-500" />;
      case 'user_created':
        return <UserPlus className="h-4 w-4 text-green-500" />;
      case 'deleted':
        return <Trash2 className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity Log</CardTitle>
        <CardDescription>
          Recent platform activity and events
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading activities...
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No recent activity
          </div>
        ) : (
          <div className="space-y-2">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center gap-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="p-2 bg-muted rounded-full">
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{activity.description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-muted-foreground">
                      {activity.timestamp.toLocaleString()}
                    </p>
                    {activity.user && (
                      <>
                        <span className="text-muted-foreground">•</span>
                        <p className="text-xs text-muted-foreground">
                          {activity.user}
                        </p>
                      </>
                    )}
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {activity.type}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

