import { YEPParticipant, YEPMentor, YEPWorkshop, YEPWorkshopAttendance, YEPAdvisorMeeting } from './youth-empowerment';

export interface ExportOptions {
  includePII: boolean;
  format: 'csv' | 'json' | 'xlsx';
  filters?: {
    participants?: {
      approved?: boolean;
      region?: string;
      mentor?: string;
    };
    workshops?: {
      dateRange?: {
        start: Date;
        end: Date;
      };
    };
    meetings?: {
      dateRange?: {
        start: Date;
        end: Date;
      };
      mentor?: string;
    };
  };
}

export interface ExportData {
  participants: YEPParticipant[];
  mentors: YEPMentor[];
  workshops: YEPWorkshop[];
  attendance: YEPWorkshopAttendance[];
  meetings: YEPAdvisorMeeting[];
}

export function sanitizeParticipantForExport(participant: YEPParticipant, includePII: boolean): Partial<YEPParticipant> {
  if (includePII) {
    return participant;
  }

  // Remove or mask PII fields
  return {
    id: participant.id,
    youthParticipant: participant.youthParticipant,
    region: participant.region,
    approved: participant.approved,
    contractSigned: participant.contractSigned,
    signedSyllabus: participant.signedSyllabus,
    availability: participant.availability,
    assignedMentor: participant.assignedMentor,
    idProvided: participant.idProvided,
    canadianStatus: participant.canadianStatus,
    // New fields (safe to include)
    age: participant.age,
    citizenshipStatus: participant.citizenshipStatus,
    location: participant.location,
    projectCategory: participant.projectCategory,
    duties: participant.duties,
    affiliationWithSCD: participant.affiliationWithSCD,
    notes: participant.notes,
    nextSteps: participant.nextSteps,
    interviewed: participant.interviewed,
    interviewNotes: participant.interviewNotes,
    recruited: participant.recruited,
    // Mask sensitive fields
    email: participant.email ? '***@***.***' : '',
    sinLast4: participant.sinLast4 ? '****' : '',
    youthProposal: participant.youthProposal ? '[Content Hidden]' : '',
    scagoCounterpart: participant.scagoCounterpart,
    dob: participant.dob,
    fileUrl: participant.fileUrl ? '[File Available]' : '',
    fileName: participant.fileName,
    createdAt: participant.createdAt,
    updatedAt: participant.updatedAt,
  };
}

export function exportToCSV(data: any[], filename: string): void {
  if (data.length === 0) {
    console.warn('No data to export');
    return;
  }

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        if (value === null || value === undefined) return '';
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    )
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportToJSON(data: any, filename: string): void {
  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.json`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportToXLSX(data: any[], filename: string, headers?: string[]): void {
  try {
    // Dynamic import to avoid SSR issues
    import('xlsx').then((XLSX) => {
      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      
      // Prepare data with proper formatting
      const formattedData = data.map(row => {
        const formattedRow: any = {};
        const keys = headers || Object.keys(row);
        
        keys.forEach(key => {
          const value = row[key];
          // Format different value types
          if (value === null || value === undefined) {
            formattedRow[key] = '';
          } else if (typeof value === 'object' && !(value instanceof Date)) {
            // Handle objects and arrays
            if (Array.isArray(value)) {
              formattedRow[key] = value.join('; ');
            } else if (value.selection) {
              // Handle select-with-other fields
              formattedRow[key] = value.other ? `${value.selection} (${value.other})` : value.selection;
            } else {
              formattedRow[key] = JSON.stringify(value);
            }
          } else if (value instanceof Date) {
            formattedRow[key] = value.toISOString();
          } else {
            formattedRow[key] = String(value);
          }
        });
        
        return formattedRow;
      });
      
      // Create worksheet from formatted data
      const ws = XLSX.utils.json_to_sheet(formattedData, { header: headers || Object.keys(data[0] || {}) });
      
      // Set column widths for better readability
      const columnWidths = (headers || Object.keys(data[0] || {})).map(key => ({
        wch: Math.max(key.length, 15) // Minimum width 15, or header length
      }));
      ws['!cols'] = columnWidths;
      
      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Data');
      
      // Generate file and trigger download
      XLSX.writeFile(wb, `${filename}.xlsx`);
    }).catch((error) => {
      console.error('Error exporting to XLSX:', error);
      // Fallback to CSV
      exportToCSV(data, filename);
    });
  } catch (error) {
    console.error('Error exporting to XLSX:', error);
    // Fallback to CSV
    exportToCSV(data, filename);
  }
}

export function generateExportFilename(prefix: string, options: ExportOptions): string {
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  const piiSuffix = options.includePII ? 'with-pii' : 'anonymized';
  return `${prefix}-${piiSuffix}-${timestamp}`;
}

export function applyFilters(data: any[], filters: any): any[] {
  let filtered = [...data];

  if (filters.approved !== undefined) {
    filtered = filtered.filter(item => item.approved === filters.approved);
  }

  if (filters.region) {
    filtered = filtered.filter(item => item.region === filters.region);
  }

  if (filters.mentor) {
    filtered = filtered.filter(item => 
      item.assignedMentor?.includes(filters.mentor) || 
      item.assignedStudents?.includes(filters.mentor)
    );
  }

  if (filters.dateRange) {
    filtered = filtered.filter(item => {
      const itemDate = new Date(item.date || item.meetingDate || item.createdAt);
      return itemDate >= filters.dateRange.start && itemDate <= filters.dateRange.end;
    });
  }

  return filtered;
}
