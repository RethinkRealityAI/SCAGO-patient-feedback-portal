'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Calendar, 
  Target,
  BarChart3,
  PieChart,
  Download,
  Filter,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { getParticipants, getWorkshops, getWorkshopAttendance, getAdvisorMeetings, getMentors } from '@/app/youth-empowerment/actions';
import { YEPParticipant, YEPWorkshop } from '@/lib/youth-empowerment';

interface AttendanceAnalytics {
  overallAttendanceRate: number;
  workshopAttendanceRate: number;
  meetingAttendanceRate: number;
  topPerformers: Array<{
    participant: YEPParticipant;
    attendanceRate: number;
    meetingsAttended: number;
  }>;
  regionalStats: Record<string, {
    totalParticipants: number;
    attendanceRate: number;
    meetingsPerParticipant: number;
  }>;
  mentorStats: Array<{
    mentorName: string;
    assignedStudents: number;
    averageAttendance: number;
    meetingsConducted: number;
  }>;
  timeBasedTrends: Array<{
    month: string;
    workshops: number;
    meetings: number;
    attendanceRate: number;
  }>;
}

interface AttendanceAnalyticsProps {
  onExport?: () => void;
}

export function AttendanceAnalytics({ onExport }: AttendanceAnalyticsProps) {
  const [analytics, setAnalytics] = useState<AttendanceAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('6months');
  const [regionFilter, setRegionFilter] = useState('all');

  useEffect(() => {
    loadAnalytics();
  }, [timeRange, regionFilter]);

  const loadAnalytics = async () => {
    setIsLoading(true);
    try {
      const [participants, workshops, attendance, meetings, mentors] = await Promise.all([
        getParticipants(),
        getWorkshops(),
        getWorkshopAttendance(),
        getAdvisorMeetings(),
        getMentors(),
      ]);

      // Filter by time range
      const now = new Date();
      const timeRangeMonths = timeRange === '3months' ? 3 : timeRange === '6months' ? 6 : 12;
      const startDate = new Date(now.getFullYear(), now.getMonth() - timeRangeMonths, 1);
      
      const filteredWorkshops = workshops.filter(w => new Date(w.date) >= startDate);
      const filteredMeetings = meetings.filter(m => new Date(m.meetingDate) >= startDate);
      const filteredAttendance = attendance.filter(a => {
        const workshop = workshops.find((w: any) => w.id === (a as any).workshopId);
        return workshop && new Date(workshop.date) >= startDate;
      });

      // Filter by region if specified
      const filteredParticipants = regionFilter === 'all' 
        ? participants 
        : participants.filter(p => p.region === regionFilter);

      // Calculate overall attendance rate
      const totalPossibleAttendance = filteredWorkshops.length * filteredParticipants.length;
      const actualAttendance = filteredAttendance.length;
      const overallAttendanceRate = totalPossibleAttendance > 0 
        ? (actualAttendance / totalPossibleAttendance) * 100 
        : 0;

      // Calculate workshop attendance rate
      const workshopAttendanceRate = filteredWorkshops.length > 0 
        ? (filteredAttendance.length / (filteredWorkshops.length * filteredParticipants.length)) * 100 
        : 0;

      // Calculate meeting attendance rate (assuming all meetings are attended)
      const meetingAttendanceRate = filteredParticipants.length > 0 
        ? (filteredMeetings.length / filteredParticipants.length) * 100 
        : 0;

      // Top performers
      const topPerformers = filteredParticipants.map(participant => {
        const participantAttendance = filteredAttendance.filter((a: any) => a.participantId === participant.id);
        const participantMeetings = filteredMeetings.filter((m: any) => m.participantId === participant.id);
        const attendanceRate = filteredWorkshops.length > 0 
          ? (participantAttendance.length / filteredWorkshops.length) * 100 
          : 0;

        return {
          participant,
          attendanceRate,
          meetingsAttended: participantMeetings.length,
        };
      }).sort((a, b) => b.attendanceRate - a.attendanceRate).slice(0, 10);

      // Regional stats
      const regionalStats: Record<string, any> = {};
      const regions = [...new Set(filteredParticipants.map(p => p.region))];
      
      regions.forEach(region => {
        const regionParticipants = filteredParticipants.filter(p => p.region === region);
        const regionAttendance = filteredAttendance.filter(a => 
          regionParticipants.some((p: any) => p.id === (a as any).participantId)
        );
        const regionMeetings = filteredMeetings.filter(m => 
          regionParticipants.some((p: any) => p.id === (m as any).participantId)
        );

        regionalStats[region] = {
          totalParticipants: regionParticipants.length,
          attendanceRate: filteredWorkshops.length > 0 
            ? (regionAttendance.length / (filteredWorkshops.length * regionParticipants.length)) * 100 
            : 0,
          meetingsPerParticipant: regionParticipants.length > 0 
            ? regionMeetings.length / regionParticipants.length 
            : 0,
        };
      });

      // Mentor stats - calculate from actual mentor data
      const mentorStats = mentors.map(mentor => {
        const mentorMeetings = filteredMeetings.filter((m: any) => m.advisorId === mentor.id);
        const mentorAttendance = filteredAttendance.filter(a => 
          mentor.assignedStudents?.includes((a as any).participantId)
        );
        
        const averageAttendance = mentor.assignedStudents && mentor.assignedStudents.length > 0
          ? (mentorAttendance.length / (filteredWorkshops.length * mentor.assignedStudents.length)) * 100
          : 0;

        return {
          mentorName: mentor.name,
          assignedStudents: mentor.assignedStudents?.length || 0,
          averageAttendance: averageAttendance,
          meetingsConducted: mentorMeetings.length,
        };
      });

      // Time-based trends (simplified)
      const timeBasedTrends = [];
      for (let i = timeRangeMonths - 1; i >= 0; i--) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthWorkshops = filteredWorkshops.filter(w => {
          const workshopDate = new Date(w.date);
          return workshopDate.getMonth() === monthDate.getMonth() && 
                 workshopDate.getFullYear() === monthDate.getFullYear();
        });
        const monthMeetings = filteredMeetings.filter(m => {
          const meetingDate = new Date(m.meetingDate);
          return meetingDate.getMonth() === monthDate.getMonth() && 
                 meetingDate.getFullYear() === monthDate.getFullYear();
        });
        const monthAttendance = filteredAttendance.filter(a => {
          const workshop = workshops.find((w: any) => w.id === (a as any).workshopId);
          if (!workshop) return false;
          const workshopDate = new Date(workshop.date);
          return workshopDate.getMonth() === monthDate.getMonth() && 
                 workshopDate.getFullYear() === monthDate.getFullYear();
        });

        timeBasedTrends.push({
          month: monthDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          workshops: monthWorkshops.length,
          meetings: monthMeetings.length,
          attendanceRate: monthWorkshops.length > 0 
            ? (monthAttendance.length / (monthWorkshops.length * filteredParticipants.length)) * 100 
            : 0,
        });
      }

      setAnalytics({
        overallAttendanceRate,
        workshopAttendanceRate,
        meetingAttendanceRate,
        topPerformers,
        regionalStats,
        mentorStats,
        timeBasedTrends,
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {[...Array(4)].map((_, i) => (
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

  if (!analytics) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            Unable to load attendance analytics
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Attendance Analytics
              </CardTitle>
              <CardDescription>
                Comprehensive attendance and engagement metrics
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3months">3 Months</SelectItem>
                  <SelectItem value="6months">6 Months</SelectItem>
                  <SelectItem value="12months">12 Months</SelectItem>
                </SelectContent>
              </Select>
              <Select value={regionFilter} onValueChange={setRegionFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Regions</SelectItem>
                  <SelectItem value="Toronto">Toronto</SelectItem>
                  <SelectItem value="Northern Ontario">Northern Ontario</SelectItem>
                  <SelectItem value="Quebec">Quebec</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={onExport}>
                <Download className="h-4 w-4 mr-2" />
                Export Report
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Attendance</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.overallAttendanceRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Across all workshops and participants
            </p>
            {analytics.overallAttendanceRate === 0 ? (
              <div className="h-2 w-full bg-muted rounded-full mt-2">
                <div className="h-full w-0 bg-muted-foreground/20 rounded-full" />
              </div>
            ) : (
              <Progress value={analytics.overallAttendanceRate} className="mt-2" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Workshop Attendance</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.workshopAttendanceRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Workshop participation rate
            </p>
            {analytics.workshopAttendanceRate === 0 ? (
              <div className="h-2 w-full bg-muted rounded-full mt-2">
                <div className="h-full w-0 bg-muted-foreground/20 rounded-full" />
              </div>
            ) : (
              <Progress value={analytics.workshopAttendanceRate} className="mt-2" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Meeting Engagement</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.meetingAttendanceRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Mentor meeting participation
            </p>
            {analytics.meetingAttendanceRate === 0 ? (
              <div className="h-2 w-full bg-muted rounded-full mt-2">
                <div className="h-full w-0 bg-muted-foreground/20 rounded-full" />
              </div>
            ) : (
              <Progress value={analytics.meetingAttendanceRate} className="mt-2" />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Performers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Top Performers
          </CardTitle>
          <CardDescription>
            Participants with highest attendance rates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.topPerformers.slice(0, 5).map((performer, index) => (
              <div key={performer.participant.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-primary/10 rounded-full">
                    <span className="text-sm font-bold text-primary">#{index + 1}</span>
                  </div>
                  <div>
                    <div className="font-medium">{performer.participant.youthParticipant}</div>
                    <div className="text-sm text-muted-foreground">{performer.participant.region}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="font-semibold">{performer.attendanceRate.toFixed(1)}%</div>
                    <div className="text-xs text-muted-foreground">Attendance</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{performer.meetingsAttended}</div>
                    <div className="text-xs text-muted-foreground">Meetings</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Regional Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5" />
            Regional Performance
          </CardTitle>
          <CardDescription>
            Attendance and engagement by region
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(analytics.regionalStats).map(([region, stats]) => (
              <div key={region} className="p-4 border rounded-lg">
                <div className="font-medium mb-2">{region}</div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Participants:</span>
                    <span className="font-medium">{stats.totalParticipants}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Attendance:</span>
                    <span className="font-medium">{stats.attendanceRate.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Meetings/Person:</span>
                    <span className="font-medium">{stats.meetingsPerParticipant.toFixed(1)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Time-based Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Monthly Trends
          </CardTitle>
          <CardDescription>
            Attendance and activity over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.timeBasedTrends.map((trend, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="font-medium">{trend.month}</div>
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <div className="font-semibold">{trend.workshops}</div>
                    <div className="text-xs text-muted-foreground">Workshops</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold">{trend.meetings}</div>
                    <div className="text-xs text-muted-foreground">Meetings</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold">{trend.attendanceRate.toFixed(1)}%</div>
                    <div className="text-xs text-muted-foreground">Attendance</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Mentor Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Mentor Performance
          </CardTitle>
          <CardDescription>
            Mentor engagement and student outcomes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.mentorStats.map((mentor, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <div className="font-medium">{mentor.mentorName}</div>
                  <div className="text-sm text-muted-foreground">
                    {mentor.assignedStudents} assigned students
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <div className="font-semibold">{mentor.averageAttendance}%</div>
                    <div className="text-xs text-muted-foreground">Avg Attendance</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold">{mentor.meetingsConducted}</div>
                    <div className="text-xs text-muted-foreground">Meetings</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
