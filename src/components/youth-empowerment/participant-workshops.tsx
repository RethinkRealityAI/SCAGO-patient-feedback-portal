'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, CheckCircle, Clock, Users } from 'lucide-react';
import { getWorkshops, getWorkshopAttendance } from '@/app/youth-empowerment/actions';
import { YEPWorkshop, YEPWorkshopAttendance } from '@/lib/youth-empowerment';

interface ParticipantWorkshopsProps {
  participantId: string;
  participantName: string;
}

export function ParticipantWorkshops({ participantId, participantName }: ParticipantWorkshopsProps) {
  const [workshops, setWorkshops] = useState<YEPWorkshop[]>([]);
  const [attendance, setAttendance] = useState<YEPWorkshopAttendance[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [participantId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [workshopsData, attendanceData] = await Promise.all([
        getWorkshops(),
        getWorkshopAttendance()
      ]);
      setWorkshops(workshopsData);
      setAttendance(attendanceData as YEPWorkshopAttendance[]);
    } catch (error) {
      console.error('Error loading workshops data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getWorkshopAttendanceStatus = (workshopId: string) => {
    const attendanceRecord = attendance.find(a => 
      a.workshopId === workshopId && a.studentId === participantId
    );
    return attendanceRecord ? 'attended' : 'not-attended';
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (workshop: YEPWorkshop) => {
    const now = new Date();
    const workshopDate = new Date(workshop.date);
    const attendanceStatus = getWorkshopAttendanceStatus(workshop.id);
    
    if (workshopDate > now) {
      return <Badge variant="default" className="bg-blue-100 text-blue-800">Upcoming</Badge>;
    } else {
      if (attendanceStatus === 'attended') {
        return (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-gray-100 text-gray-800">Past</Badge>
            <Badge variant="default" className="bg-green-100 text-green-800 flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              Attended
            </Badge>
          </div>
        );
      } else {
        return (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-gray-100 text-gray-800">Past</Badge>
            <Badge variant="outline" className="text-gray-600">Not Attended</Badge>
          </div>
        );
      }
    }
  };

  // Sort workshops by date (upcoming first, then past)
  const sortedWorkshops = [...workshops].sort((a, b) => {
    const now = new Date();
    const aDate = new Date(a.date);
    const bDate = new Date(b.date);
    
    // Upcoming workshops first
    if (aDate > now && bDate <= now) return -1;
    if (aDate <= now && bDate > now) return 1;
    
    // Then sort by date
    return aDate.getTime() - bDate.getTime();
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Workshop Attendance
          </CardTitle>
          <CardDescription>
            Loading workshop information for {participantName}...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Workshop Attendance
        </CardTitle>
        <CardDescription>
          Workshop schedule and attendance status for {participantName}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {sortedWorkshops.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No workshops scheduled</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedWorkshops.map((workshop) => (
              <div
                key={workshop.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-medium">{workshop.title}</h3>
                    {getStatusBadge(workshop)}
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDate(workshop.date)}</span>
                    </div>
                    
                    {workshop.location && (
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        <span>{workshop.location}</span>
                      </div>
                    )}
                    
                    {workshop.capacity && (
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        <span>Capacity: {workshop.capacity}</span>
                      </div>
                    )}
                  </div>
                  
                  {workshop.description && (
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                      {workshop.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

