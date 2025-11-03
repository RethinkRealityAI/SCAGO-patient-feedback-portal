'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, FileText, MessageSquare, TrendingUp } from 'lucide-react';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export function PlatformStats() {
  const [stats, setStats] = useState({
    totalSurveys: 0,
    totalSubmissions: 0,
    submissionsToday: 0,
    averageRating: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      // Get surveys
      const surveysSnapshot = await getDocs(collection(db, 'surveys'));
      const totalSurveys = surveysSnapshot.size;

      // Get all submissions from both new structure and legacy collection
      const { fetchAllSubmissions } = await import('@/lib/submission-utils');
      const submissions = await fetchAllSubmissions();
      const totalSubmissions = submissions.length;

      // Get today's submissions
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      
      const submissionsToday = submissions.filter(sub => {
        const submittedAt = sub.submittedAt instanceof Date ? sub.submittedAt : new Date(sub.submittedAt);
        return submittedAt >= startOfDay;
      }).length;

      // Calculate average rating
      const ratingsSum = submissions.reduce((sum, sub) => sum + (Number(sub.rating) || 0), 0);
      const averageRating = totalSubmissions > 0 ? (ratingsSum / totalSubmissions).toFixed(1) : 0;

      setStats({
        totalSurveys,
        totalSubmissions,
        submissionsToday,
        averageRating: Number(averageRating),
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Surveys',
      value: stats.totalSurveys,
      icon: FileText,
      description: 'Active surveys',
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'Total Submissions',
      value: stats.totalSubmissions,
      icon: MessageSquare,
      description: 'All time',
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      title: 'Today\'s Submissions',
      value: stats.submissionsToday,
      icon: TrendingUp,
      description: 'Last 24 hours',
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
    {
      title: 'Average Rating',
      value: stats.averageRating,
      icon: Users,
      description: 'Out of 10',
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
      {statCards.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {stat.title}
            </CardTitle>
            <div className={`p-2 rounded-lg ${stat.bgColor}`}>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '...' : stat.value}
            </div>
            <p className="text-xs text-muted-foreground">
              {stat.description}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

