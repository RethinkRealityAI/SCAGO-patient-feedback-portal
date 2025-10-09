'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Calendar, 
  MessageSquare, 
  Target,
  Clock,
  CheckCircle,
  AlertCircle,
  BarChart3,
  PieChart
} from 'lucide-react';
import { getParticipants, getMentors, getWorkshops, getAdvisorMeetings, getWorkshopAttendance } from '@/app/youth-empowerment/actions';

interface MetricsData {
  totalParticipants: number;
  approvedParticipants: number;
  totalMentors: number;
  totalWorkshops: number;
  totalMeetings: number;
  totalAttendanceRecords: number;
  attendanceRate: number;
  meetingFrequency: number;
  mentorUtilization: number;
  regionalDistribution: Record<string, number>;
  recentActivity: {
    newParticipants: number;
    upcomingWorkshops: number;
    recentMeetings: number;
  };
}

export function AdvancedMetrics() {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      const [participants, mentors, workshops, meetings, attendance] = await Promise.all([
        getParticipants(),
        getMentors(),
        getWorkshops(),
        getAdvisorMeetings(),
        getWorkshopAttendance(),
      ]);

      // Calculate metrics
      const totalParticipants = participants.length;
      const approvedParticipants = participants.filter(p => p.approved).length;
      const totalMentors = mentors.length;
      const totalWorkshops = workshops.length;
      const totalMeetings = meetings.length;
      const totalAttendanceRecords = attendance.length;

      // Calculate attendance rate
      const attendanceRate = totalWorkshops > 0 
        ? (totalAttendanceRecords / (totalWorkshops * totalParticipants)) * 100 
        : 0;

      // Calculate meeting frequency (average meetings per participant)
      const meetingFrequency = totalParticipants > 0 
        ? totalMeetings / totalParticipants 
        : 0;

      // Calculate mentor utilization (percentage of mentors with assigned students)
      const mentorsWithStudents = mentors.filter(m => m.assignedStudents && m.assignedStudents.length > 0).length;
      const mentorUtilization = totalMentors > 0 
        ? (mentorsWithStudents / totalMentors) * 100 
        : 0;

      // Regional distribution
      const regionalDistribution = participants.reduce((acc, participant) => {
        acc[participant.region] = (acc[participant.region] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Recent activity (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const newParticipants = participants.filter(p => 
        new Date(p.createdAt) > thirtyDaysAgo
      ).length;

      const upcomingWorkshops = workshops.filter(w => 
        new Date(w.date) > new Date()
      ).length;

      const recentMeetings = meetings.filter(m => 
        new Date(m.meetingDate) > thirtyDaysAgo
      ).length;

      setMetrics({
        totalParticipants,
        approvedParticipants,
        totalMentors,
        totalWorkshops,
        totalMeetings,
        totalAttendanceRecords,
        attendanceRate,
        meetingFrequency,
        mentorUtilization,
        regionalDistribution,
        recentActivity: {
          newParticipants,
          upcomingWorkshops,
          recentMeetings,
        }
      });
    } catch (error) {
      console.error('Error loading metrics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!metrics) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            Unable to load metrics
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Participants</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalParticipants}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.approvedParticipants} approved
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Workshop Attendance</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.attendanceRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {metrics.totalAttendanceRecords} records
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Meeting Frequency</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.meetingFrequency.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">
              avg meetings per participant
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mentor Utilization</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.mentorUtilization.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {metrics.totalMentors} total mentors
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Program Health */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Program Health
            </CardTitle>
            <CardDescription>
              Key performance indicators for the YEP program
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Approval Rate</span>
                <span className="text-sm text-muted-foreground">
                  {metrics.totalParticipants > 0 
                    ? ((metrics.approvedParticipants / metrics.totalParticipants) * 100).toFixed(1)
                    : 0}%
                </span>
              </div>
              <Progress 
                value={metrics.totalParticipants > 0 
                  ? (metrics.approvedParticipants / metrics.totalParticipants) * 100 
                  : 0} 
                className="h-2"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Workshop Attendance</span>
                <span className="text-sm text-muted-foreground">{metrics.attendanceRate.toFixed(1)}%</span>
              </div>
              {metrics.attendanceRate === 0 ? (
                <div className="h-2 w-full bg-muted rounded-full">
                  <div className="h-full w-0 bg-muted-foreground/20 rounded-full" />
                </div>
              ) : (
                <Progress value={metrics.attendanceRate} className="h-2" />
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Mentor Engagement</span>
                <span className="text-sm text-muted-foreground">{metrics.mentorUtilization.toFixed(1)}%</span>
              </div>
              {metrics.mentorUtilization === 0 ? (
                <div className="h-2 w-full bg-muted rounded-full">
                  <div className="h-full w-0 bg-muted-foreground/20 rounded-full" />
                </div>
              ) : (
                <Progress value={metrics.mentorUtilization} className="h-2" />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Regional Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Regional Distribution
            </CardTitle>
            <CardDescription>
              Participant distribution across regions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(metrics.regionalDistribution).map(([region, count]) => (
                <div key={region} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{region}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{count}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {((count / metrics.totalParticipants) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Activity (Last 30 Days)
          </CardTitle>
          <CardDescription>
            Program activity and engagement metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="font-semibold">{metrics.recentActivity.newParticipants}</div>
                <div className="text-sm text-muted-foreground">New Participants</div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Calendar className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <div className="font-semibold">{metrics.recentActivity.upcomingWorkshops}</div>
                <div className="text-sm text-muted-foreground">Upcoming Workshops</div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <MessageSquare className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <div className="font-semibold">{metrics.recentActivity.recentMeetings}</div>
                <div className="text-sm text-muted-foreground">Recent Meetings</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Program Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Program Status
          </CardTitle>
          <CardDescription>
            Overall health and status indicators
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-green-600">{metrics.totalWorkshops}</div>
              <div className="text-sm text-muted-foreground">Active Workshops</div>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{metrics.totalMeetings}</div>
              <div className="text-sm text-muted-foreground">Total Meetings</div>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{metrics.totalMentors}</div>
              <div className="text-sm text-muted-foreground">Active Mentors</div>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{metrics.totalAttendanceRecords}</div>
              <div className="text-sm text-muted-foreground">Attendance Records</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
