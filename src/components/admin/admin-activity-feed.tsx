'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, MessageSquare, Calendar, LogIn, FileText, RefreshCw } from 'lucide-react';
import { getAdminActivityFeed, AdminActivityItem } from '@/app/admin/activity-actions';
import { Button } from '@/components/ui/button';

export function AdminActivityFeed() {
  const [items, setItems] = useState<AdminActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getAdminActivityFeed(100);
      if (res.success && res.items) setItems(res.items);
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  };

  const iconFor = (type: AdminActivityItem['type']) => {
    switch (type) {
      case 'message':
        return <MessageSquare className="h-4 w-4 text-blue-500" />;
      case 'meeting':
        return <Calendar className="h-4 w-4 text-purple-500" />;
      case 'login':
        return <LogIn className="h-4 w-4 text-green-500" />;
      case 'form_submission':
        return <FileText className="h-4 w-4 text-orange-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Unified Activity Feed</CardTitle>
          <CardDescription>Recent logins, meetings, messages, and form submissions</CardDescription>
        </div>
        <Button variant="outline" onClick={refresh} disabled={refreshing}>
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading activity...</div>
        ) : items.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No recent activity</div>
        ) : (
          <div className="space-y-2">
            {items.map((it, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                <div className="p-2 bg-muted rounded-full">{iconFor(it.type)}</div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{it.description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-muted-foreground">{it.timestamp.toLocaleString()}</p>
                    {it.actor && (
                      <>
                        <span className="text-muted-foreground">•</span>
                        <p className="text-xs text-muted-foreground">{it.actor}</p>
                      </>
                    )}
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs capitalize">{it.type.replace('_', ' ')}</Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}



