'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  FileText, 
  Database, 
  Shield, 
  Filter,
  Calendar,
  Users,
  GraduationCap,
  MessageSquare,
  Target
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ExportOptions, ExportData, sanitizeParticipantForExport, exportToCSV, exportToJSON, exportToXLSX, generateExportFilename, applyFilters } from '@/lib/export-utils';
import { getParticipants, getMentors, getWorkshops, getWorkshopAttendance, getAdvisorMeetings } from '@/app/youth-empowerment/actions';

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ExportDialog({ isOpen, onClose }: ExportDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    includePII: false,
    format: 'csv',
    filters: {}
  });
  const [selectedDataTypes, setSelectedDataTypes] = useState<string[]>(['participants']);
  const [customFilename, setCustomFilename] = useState('');
  const { toast } = useToast();

  const dataTypes = [
    { id: 'participants', label: 'Participants', icon: Users, description: 'Youth participants and their information' },
    { id: 'mentors', label: 'Mentors', icon: GraduationCap, description: 'Mentor information and assignments' },
    { id: 'workshops', label: 'Workshops', icon: Calendar, description: 'Workshop schedules and details' },
    { id: 'attendance', label: 'Attendance', icon: Target, description: 'Workshop attendance records' },
    { id: 'meetings', label: 'Meetings', icon: MessageSquare, description: 'Advisor meeting records' },
  ];

  const handleDataTypeToggle = (dataType: string) => {
    setSelectedDataTypes(prev => 
      prev.includes(dataType) 
        ? prev.filter(type => type !== dataType)
        : [...prev, dataType]
    );
  };

  const handleExport = async () => {
    if (selectedDataTypes.length === 0) {
      toast({
        title: 'No Data Selected',
        description: 'Please select at least one data type to export.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      // Load all selected data
      const dataPromises = [];
      if (selectedDataTypes.includes('participants')) {
        dataPromises.push(getParticipants());
      } else {
        dataPromises.push(Promise.resolve([]));
      }
      
      if (selectedDataTypes.includes('mentors')) {
        dataPromises.push(getMentors());
      } else {
        dataPromises.push(Promise.resolve([]));
      }
      
      if (selectedDataTypes.includes('workshops')) {
        dataPromises.push(getWorkshops());
      } else {
        dataPromises.push(Promise.resolve([]));
      }
      
      if (selectedDataTypes.includes('attendance')) {
        dataPromises.push(getWorkshopAttendance());
      } else {
        dataPromises.push(Promise.resolve([]));
      }
      
      if (selectedDataTypes.includes('meetings')) {
        dataPromises.push(getAdvisorMeetings());
      } else {
        dataPromises.push(Promise.resolve([]));
      }

      const [participants, mentors, workshops, attendance, meetings] = await Promise.all(dataPromises);

      // Apply filters
      let filteredParticipants = participants;
      let filteredMentors = mentors;
      let filteredWorkshops = workshops;
      let filteredAttendance = attendance;
      let filteredMeetings = meetings;

      if (exportOptions.filters?.participants) {
        filteredParticipants = applyFilters(participants, exportOptions.filters.participants);
      }

      if (exportOptions.filters?.workshops) {
        filteredWorkshops = applyFilters(workshops, exportOptions.filters.workshops);
      }

      if (exportOptions.filters?.meetings) {
        filteredMeetings = applyFilters(meetings, exportOptions.filters.meetings);
      }

      // Sanitize data based on PII settings
      const sanitizedParticipants = filteredParticipants.map(p => 
        sanitizeParticipantForExport(p, exportOptions.includePII)
      );

      // Generate filename
      const filename = customFilename || generateExportFilename('yep-export', exportOptions);

      // Export based on format
      if (exportOptions.format === 'csv') {
        // Export each data type separately
        if (selectedDataTypes.includes('participants') && sanitizedParticipants.length > 0) {
          exportToCSV(sanitizedParticipants, `${filename}-participants`);
        }
        if (selectedDataTypes.includes('mentors') && filteredMentors.length > 0) {
          exportToCSV(filteredMentors, `${filename}-mentors`);
        }
        if (selectedDataTypes.includes('workshops') && filteredWorkshops.length > 0) {
          exportToCSV(filteredWorkshops, `${filename}-workshops`);
        }
        if (selectedDataTypes.includes('attendance') && filteredAttendance.length > 0) {
          exportToCSV(filteredAttendance, `${filename}-attendance`);
        }
        if (selectedDataTypes.includes('meetings') && filteredMeetings.length > 0) {
          exportToCSV(filteredMeetings, `${filename}-meetings`);
        }
      } else if (exportOptions.format === 'json') {
        const exportData: ExportData = {
          participants: sanitizedParticipants as YEPParticipant[],
          mentors: filteredMentors,
          workshops: filteredWorkshops,
          attendance: filteredAttendance,
          meetings: filteredMeetings,
        };
        exportToJSON(exportData, filename);
      } else if (exportOptions.format === 'xlsx') {
        // For XLSX, we'll export as a single file with multiple sheets
        const allData = [];
        if (selectedDataTypes.includes('participants')) allData.push(...sanitizedParticipants);
        if (selectedDataTypes.includes('mentors')) allData.push(...filteredMentors);
        if (selectedDataTypes.includes('workshops')) allData.push(...filteredWorkshops);
        if (selectedDataTypes.includes('attendance')) allData.push(...filteredAttendance);
        if (selectedDataTypes.includes('meetings')) allData.push(...filteredMeetings);
        
        exportToXLSX(allData, filename);
      }

      toast({
        title: 'Export Successful',
        description: `Data exported successfully as ${exportOptions.format.toUpperCase()}`,
      });

      onClose();
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Export Failed',
        description: 'An error occurred while exporting data.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Data
          </DialogTitle>
          <DialogDescription>
            Export Youth Empowerment Program data with custom filters and privacy options
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Data Type Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Database className="h-5 w-5" />
                Select Data Types
              </CardTitle>
              <CardDescription>
                Choose which data types to include in the export
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {dataTypes.map((dataType) => {
                  const Icon = dataType.icon;
                  return (
                    <div
                      key={dataType.id}
                      className={`flex items-start space-x-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                        selectedDataTypes.includes(dataType.id)
                          ? 'bg-primary/10 border-primary'
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => handleDataTypeToggle(dataType.id)}
                    >
                      <Checkbox
                        checked={selectedDataTypes.includes(dataType.id)}
                        onChange={() => {}} // Handled by parent click
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          <span className="font-medium">{dataType.label}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {dataType.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Export Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Export Format
                </CardTitle>
                <CardDescription>
                  Choose the file format for your export
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="format">Format</Label>
                  <Select 
                    value={exportOptions.format} 
                    onValueChange={(value: 'csv' | 'json' | 'xlsx') => 
                      setExportOptions(prev => ({ ...prev, format: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="csv">CSV (Multiple files)</SelectItem>
                      <SelectItem value="json">JSON (Single file)</SelectItem>
                      <SelectItem value="xlsx">Excel (Single file)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="filename">Custom Filename (Optional)</Label>
                  <Input
                    id="filename"
                    value={customFilename}
                    onChange={(e) => setCustomFilename(e.target.value)}
                    placeholder="yep-export-2024"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Privacy Settings
                </CardTitle>
                <CardDescription>
                  Control the inclusion of sensitive information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includePII"
                    checked={exportOptions.includePII}
                    onCheckedChange={(checked) => 
                      setExportOptions(prev => ({ ...prev, includePII: !!checked }))
                    }
                  />
                  <Label htmlFor="includePII" className="flex-1">
                    Include Personal Information
                  </Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  {exportOptions.includePII ? (
                    <span className="text-red-600">⚠️ Full data including emails, SIN, and proposals will be included</span>
                  ) : (
                    <span className="text-green-600">✓ Sensitive data will be masked or removed</span>
                  )}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters (Optional)
              </CardTitle>
              <CardDescription>
                Apply filters to limit the exported data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="participantFilter">Participants</Label>
                  <Select 
                    value={exportOptions.filters?.participants?.approved === undefined ? 'all' : exportOptions.filters.participants.approved ? 'approved' : 'pending'}
                    onValueChange={(value) => {
                      const approved = value === 'all' ? undefined : value === 'approved';
                      setExportOptions(prev => ({
                        ...prev,
                        filters: {
                          ...prev.filters,
                          participants: {
                            ...prev.filters?.participants,
                            approved
                          }
                        }
                      }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All participants" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Participants</SelectItem>
                      <SelectItem value="approved">Approved Only</SelectItem>
                      <SelectItem value="pending">Pending Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="regionFilter">Region</Label>
                  <Input
                    id="regionFilter"
                    placeholder="e.g., Toronto, Northern Ontario"
                    value={exportOptions.filters?.participants?.region || ''}
                    onChange={(e) => 
                      setExportOptions(prev => ({
                        ...prev,
                        filters: {
                          ...prev.filters,
                          participants: {
                            ...prev.filters?.participants,
                            region: e.target.value || undefined
                          }
                        }
                      }))
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Export Summary</CardTitle>
              <CardDescription>
                Review your export configuration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Data Types:</span>
                  <div className="flex gap-1">
                    {selectedDataTypes.map(type => (
                      <Badge key={type} variant="secondary">
                        {dataTypes.find(dt => dt.id === type)?.label}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Format:</span>
                  <Badge variant="outline">{exportOptions.format.toUpperCase()}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Privacy:</span>
                  <Badge variant={exportOptions.includePII ? "destructive" : "default"}>
                    {exportOptions.includePII ? "Full Data" : "Anonymized"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleExport} 
            disabled={isLoading || selectedDataTypes.length === 0}
          >
            {isLoading && <Download className="mr-2 h-4 w-4 animate-spin" />}
            Export Data
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
