'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Plus, 
  Trash2, 
  Users, 
  Calendar, 
  Clock,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  Download,
  Upload
} from 'lucide-react';
import { getParticipants, getMentors } from '@/app/youth-empowerment/actions';

interface MeetingRecord {
  id: string;
  studentId: string;
  studentName?: string;
  advisorId: string;
  advisorName?: string;
  meetingDate: string;
  duration: number;
  topics: string[];
  notes: string;
  completed: boolean;
}

interface BulkMeetingEntryProps {
  value?: MeetingRecord[];
  onChange?: (records: MeetingRecord[]) => void;
  disabled?: boolean;
  onSave?: (records: MeetingRecord[]) => void;
}

const commonTopics = [
  'Project Planning',
  'Research Methods',
  'Career Guidance',
  'Academic Support',
  'Personal Development',
  'Networking',
  'Skill Building',
  'Goal Setting',
  'Challenges & Solutions',
  'Next Steps',
  'Other'
];

export function BulkMeetingEntry({ 
  value = [], 
  onChange, 
  disabled, 
  onSave 
}: BulkMeetingEntryProps) {
  const [meetingRecords, setMeetingRecords] = useState<MeetingRecord[]>(value);
  const [participants, setParticipants] = useState<any[]>([]);
  const [mentors, setMentors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    onChange?.(meetingRecords);
  }, [meetingRecords, onChange]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [participantsResult, mentorsResult] = await Promise.all([
        getParticipants({ approved: true }),
        getMentors()
      ]);
      setParticipants(participantsResult as any);
      setMentors(mentorsResult as any);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addRecord = () => {
    const newRecord: MeetingRecord = {
      id: Math.random().toString(36).substr(2, 9),
      studentId: '',
      advisorId: '',
      meetingDate: new Date().toISOString().slice(0, 16),
      duration: 60,
      topics: [],
      notes: '',
      completed: false,
    };
    setMeetingRecords([...meetingRecords, newRecord]);
  };

  const removeRecord = (id: string) => {
    setMeetingRecords(meetingRecords.filter(record => record.id !== id));
  };

  const updateRecord = (id: string, field: keyof MeetingRecord, value: any) => {
    setMeetingRecords(meetingRecords.map(record => 
      record.id === id ? { ...record, [field]: value } : record
    ));
  };

  const getParticipantName = (participantId: string) => {
    const participant = participants.find(p => p.id === participantId);
    return participant ? participant.youthParticipant : 'Unknown Participant';
  };

  const getMentorName = (mentorId: string) => {
    const mentor = mentors.find(m => m.id === mentorId);
    return mentor ? mentor.name : 'Unknown Mentor';
  };

  const handleTopicToggle = (recordId: string, topic: string) => {
    const record = meetingRecords.find(r => r.id === recordId);
    if (!record) return;

    const newTopics = record.topics.includes(topic)
      ? record.topics.filter(t => t !== topic)
      : [...record.topics, topic];
    
    updateRecord(recordId, 'topics', newTopics);
  };

  const handleSave = () => {
    onSave?.(meetingRecords);
  };

  const handleImport = () => {
    // TODO: Implement CSV import functionality
    console.log('Import CSV functionality');
  };

  const handleExport = () => {
    // TODO: Implement CSV export functionality
    console.log('Export CSV functionality');
  };

  const completedCount = meetingRecords.filter(r => r.completed).length;
  const totalCount = meetingRecords.length;
  const totalDuration = meetingRecords.reduce((sum, record) => sum + (record.duration || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Bulk Meeting Entry</h3>
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

      <div className="space-y-3">
        {meetingRecords.map((record, index) => (
          <Card key={record.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Meeting #{index + 1}</CardTitle>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={record.completed}
                    onCheckedChange={(checked) => updateRecord(record.id, 'completed', checked)}
                    disabled={disabled}
                  />
                  <span className="text-sm text-muted-foreground">Completed</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Participant</label>
                  <Select
                    value={record.studentId}
                    onValueChange={(value) => {
                      updateRecord(record.id, 'studentId', value);
                      updateRecord(record.id, 'studentName', getParticipantName(value));
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

                <div className="space-y-2">
                  <label className="text-sm font-medium">Advisor</label>
                  <Select
                    value={record.advisorId}
                    onValueChange={(value) => {
                      updateRecord(record.id, 'advisorId', value);
                      updateRecord(record.id, 'advisorName', getMentorName(value));
                    }}
                    disabled={disabled}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select advisor" />
                    </SelectTrigger>
                    <SelectContent>
                      {mentors.map((mentor) => (
                        <SelectItem key={mentor.id} value={mentor.id}>
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            <div>
                              <div className="font-medium">{mentor.name}</div>
                              <div className="text-sm text-muted-foreground">{mentor.title}</div>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Meeting Date & Time</label>
                  <Input
                    type="datetime-local"
                    value={record.meetingDate}
                    onChange={(e) => updateRecord(record.id, 'meetingDate', e.target.value)}
                    disabled={disabled}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Duration (minutes)</label>
                  <Input
                    type="number"
                    value={record.duration}
                    onChange={(e) => updateRecord(record.id, 'duration', parseInt(e.target.value) || 0)}
                    disabled={disabled}
                    min="0"
                    max="480"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Discussion Topics</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {commonTopics.map((topic) => (
                    <div
                      key={topic}
                      className={`flex items-center space-x-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                        record.topics.includes(topic)
                          ? 'bg-primary/10 border-primary'
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => handleTopicToggle(record.id, topic)}
                    >
                      <Checkbox
                        checked={record.topics.includes(topic)}
                        onChange={() => handleTopicToggle(record.id, topic)}
                        disabled={disabled}
                      />
                      <span className="text-sm">{topic}</span>
                    </div>
                  ))}
                </div>
                {record.topics.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {record.topics.map((topic) => (
                      <Badge key={topic} variant="secondary" className="text-xs">
                        {topic}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Meeting Notes</label>
                <Textarea
                  placeholder="Record key discussion points, decisions made, next steps, and any important outcomes..."
                  value={record.notes}
                  onChange={(e) => updateRecord(record.id, 'notes', e.target.value)}
                  disabled={disabled}
                  rows={3}
                />
              </div>

              <div className="flex justify-end">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => removeRecord(record.id)}
                  disabled={disabled}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remove Meeting
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <Button onClick={addRecord} disabled={disabled}>
          <Plus className="h-4 w-4 mr-2" />
          Add Meeting Record
        </Button>
        
        {meetingRecords.length > 0 && (
          <Button onClick={handleSave} disabled={disabled}>
            Save Meeting Records
          </Button>
        )}
      </div>

      {meetingRecords.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-primary">{totalCount}</div>
                <div className="text-sm text-muted-foreground">Total Meetings</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{completedCount}</div>
                <div className="text-sm text-muted-foreground">Completed</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">{totalDuration}</div>
                <div className="text-sm text-muted-foreground">Total Minutes</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  {totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0}%
                </div>
                <div className="text-sm text-muted-foreground">Completion Rate</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
