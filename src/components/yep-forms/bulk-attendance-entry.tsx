'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Plus, 
  Trash2, 
  Users, 
  Calendar, 
  CheckCircle, 
  XCircle,
  AlertCircle,
  Download,
  Upload
} from 'lucide-react';
import { getParticipants, getWorkshops } from '@/app/youth-empowerment/actions';

interface AttendanceRecord {
  id: string;
  participantId: string;
  participantName?: string;
  attended: boolean;
  notes: string;
  checkInTime?: string;
  checkOutTime?: string;
}

interface BulkAttendanceEntryProps {
  value?: AttendanceRecord[];
  onChange?: (records: AttendanceRecord[]) => void;
  disabled?: boolean;
  workshopId?: string;
  onSave?: (records: AttendanceRecord[]) => void;
}

export function BulkAttendanceEntry({ 
  value = [], 
  onChange, 
  disabled, 
  workshopId,
  onSave 
}: BulkAttendanceEntryProps) {
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(value);
  const [participants, setParticipants] = useState<any[]>([]);
  const [workshops, setWorkshops] = useState<any[]>([]);
  const [selectedWorkshop, setSelectedWorkshop] = useState<string>(workshopId || '');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    onChange?.(attendanceRecords);
  }, [attendanceRecords, onChange]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [participantsResult, workshopsResult] = await Promise.all([
        getParticipants({ approved: true }),
        getWorkshops()
      ]);

      setParticipants(participantsResult as any);
      setWorkshops(workshopsResult as any);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addRecord = () => {
    const newRecord: AttendanceRecord = {
      id: Math.random().toString(36).substr(2, 9),
      participantId: '',
      attended: false,
      notes: '',
      checkInTime: new Date().toISOString().slice(0, 16),
    };
    setAttendanceRecords([...attendanceRecords, newRecord]);
  };

  const removeRecord = (id: string) => {
    setAttendanceRecords(attendanceRecords.filter(record => record.id !== id));
  };

  const updateRecord = (id: string, field: keyof AttendanceRecord, value: any) => {
    setAttendanceRecords(attendanceRecords.map(record => 
      record.id === id ? { ...record, [field]: value } : record
    ));
  };

  const getParticipantName = (participantId: string) => {
    const participant = participants.find(p => p.id === participantId);
    return participant ? participant.youthParticipant : 'Unknown Participant';
  };

  const getWorkshopInfo = () => {
    const workshop = workshops.find(w => w.id === selectedWorkshop);
    return workshop;
  };

  const handleSave = () => {
    onSave?.(attendanceRecords);
  };

  const handleImport = () => {
    // TODO: Implement CSV import functionality
    console.log('Import CSV functionality');
  };

  const handleExport = () => {
    // TODO: Implement CSV export functionality
    console.log('Export CSV functionality');
  };

  const attendedCount = attendanceRecords.filter(r => r.attended).length;
  const totalCount = attendanceRecords.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Bulk Attendance Entry</h3>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleImport} disabled={disabled}>
            <Upload className="h-4 w-4 mr-2" />
            Import CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={disabled}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {workshops.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Workshop</label>
              <Select value={selectedWorkshop} onValueChange={setSelectedWorkshop} disabled={disabled}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a workshop" />
                </SelectTrigger>
                <SelectContent>
                  {workshops.map((workshop) => (
                    <SelectItem key={workshop.id} value={workshop.id}>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <div>
                          <div className="font-medium">{workshop.title}</div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(workshop.date).toLocaleDateString()} • {workshop.location}
                          </div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedWorkshop && getWorkshopInfo() && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">{getWorkshopInfo()?.title}</h4>
                <p className="text-sm text-muted-foreground">
                  {new Date(getWorkshopInfo()?.date).toLocaleDateString()} • {getWorkshopInfo()?.location}
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-primary">{attendedCount}/{totalCount}</div>
                <div className="text-sm text-muted-foreground">Attended</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {attendanceRecords.map((record, index) => (
          <Card key={record.id}>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">#{index + 1}</span>
                  <Checkbox
                    checked={record.attended}
                    onCheckedChange={(checked) => updateRecord(record.id, 'attended', checked)}
                    disabled={disabled}
                  />
                </div>
                
                <div className="flex-1">
                  <Select
                    value={record.participantId}
                    onValueChange={(value) => {
                      updateRecord(record.id, 'participantId', value);
                      updateRecord(record.id, 'participantName', getParticipantName(value));
                    }}
                    disabled={disabled}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select participant" />
                    </SelectTrigger>
                    <SelectContent>
                      {participants.map((participant) => (
                        <SelectItem key={participant.id} value={participant.id}>
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            <div>
                              <div className="font-medium">{participant.youthParticipant}</div>
                              <div className="text-sm text-muted-foreground">
                                {participant.email} • {participant.region}
                              </div>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <Input
                    type="datetime-local"
                    value={record.checkInTime}
                    onChange={(e) => updateRecord(record.id, 'checkInTime', e.target.value)}
                    disabled={disabled}
                    className="w-40"
                    placeholder="Check-in time"
                  />
                  <Input
                    type="datetime-local"
                    value={record.checkOutTime}
                    onChange={(e) => updateRecord(record.id, 'checkOutTime', e.target.value)}
                    disabled={disabled}
                    className="w-40"
                    placeholder="Check-out time"
                  />
                </div>

                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => removeRecord(record.id)}
                  disabled={disabled}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              
              <Textarea
                placeholder="Notes (optional)"
                value={record.notes}
                onChange={(e) => updateRecord(record.id, 'notes', e.target.value)}
                disabled={disabled}
                className="mt-3"
                rows={2}
              />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <Button onClick={addRecord} disabled={disabled}>
          <Plus className="h-4 w-4 mr-2" />
          Add Attendance Record
        </Button>
        
        {attendanceRecords.length > 0 && (
          <Button onClick={handleSave} disabled={disabled}>
            Save Attendance Records
          </Button>
        )}
      </div>

      {attendanceRecords.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-primary">{totalCount}</div>
                <div className="text-sm text-muted-foreground">Total Records</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{attendedCount}</div>
                <div className="text-sm text-muted-foreground">Attended</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">{totalCount - attendedCount}</div>
                <div className="text-sm text-muted-foreground">Absent</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {totalCount > 0 ? Math.round((attendedCount / totalCount) * 100) : 0}%
                </div>
                <div className="text-sm text-muted-foreground">Attendance Rate</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
