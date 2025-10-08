'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Users, 
  GraduationCap, 
  Calendar, 
  MessageSquare, 
  TrendingUp,
  UserCheck,
  Clock,
  MapPin,
  FileText,
  BarChart3,
  Activity,
  Download
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  getParticipants, 
  getMentors, 
  getWorkshops, 
  getAdvisorMeetings,
  getWorkshopAttendance 
} from './actions';
import { YEPParticipant, YEPMentor, YEPWorkshop } from '@/lib/youth-empowerment';
import { ParticipantsTable } from '@/components/youth-empowerment/participants-table';
import { MentorsTable } from '@/components/youth-empowerment/mentors-table';
import { WorkshopsTable } from '@/components/youth-empowerment/workshops-table';
import { MeetingsTable } from '@/components/youth-empowerment/meetings-table';
import { MeetingForm } from '@/components/youth-empowerment/meeting-form';
import { AttendanceForm } from '@/components/youth-empowerment/attendance-form';
import { BulkAttendanceForm } from '@/components/youth-empowerment/bulk-attendance-form';
import { BulkMeetingForm } from '@/components/youth-empowerment/bulk-meeting-form';
import { AdvancedMetrics } from '@/components/youth-empowerment/advanced-metrics';
import { ExportDialog } from '@/components/youth-empowerment/export-dialog';
import { AttendanceAnalytics } from '@/components/youth-empowerment/attendance-analytics';

export default function YouthEmpowermentClient() {
  const [activeTab, setActiveTab] = useState('overview');
  const [participants, setParticipants] = useState<YEPParticipant[]>([]);
  const [mentors, setMentors] = useState<YEPMentor[]>([]);
  const [workshops, setWorkshops] = useState<YEPWorkshop[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMeetingFormOpen, setIsMeetingFormOpen] = useState(false);
  const [isAttendanceFormOpen, setIsAttendanceFormOpen] = useState(false);
  const [isBulkAttendanceFormOpen, setIsBulkAttendanceFormOpen] = useState(false);
  const [isBulkMeetingFormOpen, setIsBulkMeetingFormOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [participantsData, mentorsData, workshopsData] = await Promise.all([
        getParticipants(),
        getMentors(),
        getWorkshops(),
      ]);
      setParticipants(participantsData);
      setMentors(mentorsData);
      setWorkshops(workshopsData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load dashboard data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    loadData();
  };

  // Calculate dashboard metrics
  const approvedParticipants = participants.filter(p => p.approved).length;
  const pendingParticipants = participants.filter(p => !p.approved).length;
  const upcomingWorkshops = workshops.filter(w => new Date(w.date) > new Date()).length;
  const pastWorkshops = workshops.filter(w => new Date(w.date) <= new Date()).length;
  const totalMentors = mentors.length;
  const participantsWithMentors = participants.filter(p => p.assignedMentor).length;

  // Regional distribution
  const regionalDistribution = participants.reduce((acc, p) => {
    acc[p.region] = (acc[p.region] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Document completion rates
  const contractSigned = participants.filter(p => p.contractSigned).length;
  const syllabusSigned = participants.filter(p => p.signedSyllabus).length;
  const idProvided = participants.filter(p => p.idProvided).length;
  const scdProof = participants.filter(p => p.proofOfAffiliationWithSCD).length;

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Youth Empowerment Program</h1>
          <p className="text-muted-foreground mt-2">
            Manage participants, mentors, workshops, and program activities
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setIsAttendanceFormOpen(true)}
          >
            <Calendar className="h-4 w-4 mr-2" />
            Mark Attendance
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setIsBulkAttendanceFormOpen(true)}
          >
            <Calendar className="h-4 w-4 mr-2" />
            Bulk Attendance
          </Button>
          <Button onClick={() => setIsMeetingFormOpen(true)}>
            <MessageSquare className="h-4 w-4 mr-2" />
            Record Meeting
          </Button>
          <Button 
            variant="outline"
            onClick={() => setIsBulkMeetingFormOpen(true)}
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Bulk Meeting
          </Button>
          <Button 
            variant="outline"
            onClick={() => setIsExportDialogOpen(true)}
          >
            <Download className="h-4 w-4 mr-2" />
            Export Data
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="participants">Participants</TabsTrigger>
          <TabsTrigger value="mentors">Mentors</TabsTrigger>
          <TabsTrigger value="workshops">Workshops</TabsTrigger>
          <TabsTrigger value="meetings">Meetings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="space-y-6">
            <AdvancedMetrics />
            <AttendanceAnalytics onExport={() => setIsExportDialogOpen(true)} />
          </div>
        </TabsContent>

        <TabsContent value="overview-old" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Participants</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{participants.length}</div>
                <p className="text-xs text-muted-foreground">
                  <Badge variant="default" className="mr-2">{approvedParticipants} approved</Badge>
                  <Badge variant="secondary">{pendingParticipants} pending</Badge>
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Mentors</CardTitle>
                <GraduationCap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalMentors}</div>
                <p className="text-xs text-muted-foreground">
                  {participantsWithMentors} participants assigned
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Workshops</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{workshops.length}</div>
                <p className="text-xs text-muted-foreground">
                  <Badge variant="default" className="mr-2">{upcomingWorkshops} upcoming</Badge>
                  <Badge variant="secondary">{pastWorkshops} completed</Badge>
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Document Completion</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Math.round(((contractSigned + syllabusSigned + idProvided + scdProof) / (participants.length * 4)) * 100)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Average completion rate
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Regional Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Regional Distribution
                </CardTitle>
                <CardDescription>Participants by region</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(regionalDistribution).map(([region, count]) => (
                    <div key={region} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{region}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-muted rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full" 
                            style={{ width: `${(count / participants.length) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground w-8">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Document Status
                </CardTitle>
                <CardDescription>Completion rates for required documents</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Contract Signed</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-muted rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full" 
                          style={{ width: `${(contractSigned / participants.length) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground w-8">{contractSigned}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Syllabus Signed</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-muted rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full" 
                          style={{ width: `${(syllabusSigned / participants.length) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground w-8">{syllabusSigned}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">ID Provided</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-muted rounded-full h-2">
                        <div 
                          className="bg-yellow-500 h-2 rounded-full" 
                          style={{ width: `${(idProvided / participants.length) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground w-8">{idProvided}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">SCD Proof</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-muted rounded-full h-2">
                        <div 
                          className="bg-purple-500 h-2 rounded-full" 
                          style={{ width: `${(scdProof / participants.length) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground w-8">{scdProof}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common tasks and shortcuts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button 
                  variant="outline" 
                  className="h-20 flex flex-col gap-2"
                  onClick={() => setActiveTab('participants')}
                >
                  <Users className="h-6 w-6" />
                  <span>Manage Participants</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-20 flex flex-col gap-2"
                  onClick={() => setActiveTab('mentors')}
                >
                  <GraduationCap className="h-6 w-6" />
                  <span>Manage Mentors</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-20 flex flex-col gap-2"
                  onClick={() => setActiveTab('workshops')}
                >
                  <Calendar className="h-6 w-6" />
                  <span>Manage Workshops</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="participants">
          <ParticipantsTable onRefresh={handleRefresh} />
        </TabsContent>

        <TabsContent value="mentors">
          <MentorsTable onRefresh={handleRefresh} />
        </TabsContent>

        <TabsContent value="workshops">
          <WorkshopsTable onRefresh={handleRefresh} />
        </TabsContent>

        <TabsContent value="meetings">
          <MeetingsTable onRefresh={handleRefresh} />
        </TabsContent>
      </Tabs>

      {/* Forms */}
      <MeetingForm
        isOpen={isMeetingFormOpen}
        onClose={() => setIsMeetingFormOpen(false)}
        onSuccess={handleRefresh}
      />

      <AttendanceForm
        isOpen={isAttendanceFormOpen}
        onClose={() => setIsAttendanceFormOpen(false)}
        onSuccess={handleRefresh}
      />

      <BulkAttendanceForm
        isOpen={isBulkAttendanceFormOpen}
        onClose={() => setIsBulkAttendanceFormOpen(false)}
        onSuccess={handleRefresh}
      />

      <BulkMeetingForm
        isOpen={isBulkMeetingFormOpen}
        onClose={() => setIsBulkMeetingFormOpen(false)}
        onSuccess={handleRefresh}
      />

      <ExportDialog
        isOpen={isExportDialogOpen}
        onClose={() => setIsExportDialogOpen(false)}
      />
    </div>
  );
}
