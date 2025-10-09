import { YEPParticipant, YEPMentor, YEPWorkshop, YEPWorkshopAttendance, YEPAdvisorMeeting } from './youth-empowerment';

export interface ImportOptions {
  targetTable: 'participants' | 'mentors' | 'workshops' | 'attendance' | 'meetings';
  format: 'csv' | 'json' | 'xlsx';
  skipDuplicates: boolean;
  updateExisting: boolean;
  validateData: boolean;
  batchSize: number;
}

export interface ImportMapping {
  [csvColumn: string]: string; // Maps CSV column names to database field names
}

export interface ImportResult {
  success: boolean;
  imported: number;
  updated: number;
  skipped: number;
  errors: ImportError[];
  message: string;
}

export interface ImportError {
  row: number;
  field?: string;
  message: string;
  value?: any;
}

export interface ImportPreview {
  headers: string[];
  sampleData: any[];
  totalRows: number;
  mapping: ImportMapping;
  validationErrors: ImportError[];
}

// Supported file formats
export const SUPPORTED_FORMATS = ['csv', 'json', 'xlsx'] as const;
export type SupportedFormat = typeof SUPPORTED_FORMATS[number];

// Table schemas for validation
export const TABLE_SCHEMAS = {
  participants: {
    required: ['youthParticipant', 'email', 'region', 'dob', 'canadianStatus'],
    optional: [
      'etransferEmailAddress', 'mailingAddress', 'phoneNumber', 'approved', 
      'contractSigned', 'signedSyllabus', 'availability', 'assignedMentor', 
      'idProvided', 'canadianStatusOther', 'sin', 'sinLast4', 'sinHash',
      'youthProposal', 'proofOfAffiliationWithSCD', 'scagoCounterpart',
      'age', 'citizenshipStatus', 'location', 'projectCategory', 'duties',
      'affiliationWithSCD', 'notes', 'nextSteps', 'interviewed', 
      'interviewNotes', 'recruited', 'fileUrl', 'fileName', 'fileType'
    ],
    types: {
      youthParticipant: 'string',
      email: 'email',
      region: 'string',
      dob: 'date',
      age: 'number',
      approved: 'boolean',
      contractSigned: 'boolean',
      signedSyllabus: 'boolean',
      idProvided: 'boolean',
      proofOfAffiliationWithSCD: 'boolean',
      interviewed: 'boolean',
      recruited: 'boolean',
      canadianStatus: 'enum:Canadian Citizen,Permanent Resident,Other'
    }
  },
  mentors: {
    required: ['name', 'title', 'email'],
    optional: ['phone', 'specialization', 'availability', 'notes'],
    types: {
      name: 'string',
      title: 'string',
      email: 'email',
      phone: 'string'
    }
  },
  workshops: {
    required: ['title', 'date', 'description'],
    optional: ['time', 'location', 'capacity', 'mentor', 'notes'],
    types: {
      title: 'string',
      date: 'date',
      description: 'string',
      capacity: 'number'
    }
  },
  attendance: {
    required: ['participantId', 'workshopId', 'attended'],
    optional: ['notes', 'rating', 'feedback'],
    types: {
      participantId: 'string',
      workshopId: 'string',
      attended: 'boolean',
      rating: 'number'
    }
  },
  meetings: {
    required: ['participantId', 'mentorId', 'meetingDate', 'type'],
    optional: ['duration', 'topics', 'notes', 'followUp'],
    types: {
      participantId: 'string',
      mentorId: 'string',
      meetingDate: 'date',
      type: 'string',
      duration: 'number'
    }
  }
};

// Parse CSV content
export function parseCSV(content: string): { headers: string[]; data: any[] } {
  const lines = content.split('\n').filter(line => line.trim());
  if (lines.length === 0) return { headers: [], data: [] };
  
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  const data = lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
    const row: any = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    return row;
  });
  
  return { headers, data };
}

// Parse JSON content
export function parseJSON(content: string): any[] {
  try {
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch (error) {
    throw new Error('Invalid JSON format');
  }
}

// Validate data against schema
export function validateData(data: any[], table: keyof typeof TABLE_SCHEMAS): ImportError[] {
  const schema = TABLE_SCHEMAS[table];
  const errors: ImportError[] = [];
  
  data.forEach((row, index) => {
    // Check required fields
    schema.required.forEach(field => {
      if (!row[field] || row[field].toString().trim() === '') {
        errors.push({
          row: index + 1,
          field,
          message: `Required field '${field}' is missing or empty`,
          value: row[field]
        });
      }
    });
    
    // Validate field types
    Object.entries(schema.types).forEach(([field, type]) => {
      const value = row[field];
      if (value === undefined || value === null || value === '') return;
      
      switch (type) {
        case 'email':
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            errors.push({
              row: index + 1,
              field,
              message: `Invalid email format`,
              value
            });
          }
          break;
        case 'number':
          if (isNaN(Number(value))) {
            errors.push({
              row: index + 1,
              field,
              message: `Value must be a number`,
              value
            });
          }
          break;
        case 'boolean':
          if (!['true', 'false', '1', '0', 'yes', 'no'].includes(value.toLowerCase())) {
            errors.push({
              row: index + 1,
              field,
              message: `Value must be true/false, 1/0, or yes/no`,
              value
            });
          }
          break;
        case 'date':
          if (isNaN(Date.parse(value))) {
            errors.push({
              row: index + 1,
              field,
              message: `Invalid date format`,
              value
            });
          }
          break;
        default:
          if (type.startsWith('enum:')) {
            const allowedValues = type.split(':')[1].split(',');
            if (!allowedValues.includes(value)) {
              errors.push({
                row: index + 1,
                field,
                message: `Value must be one of: ${allowedValues.join(', ')}`,
                value
              });
            }
          }
      }
    });
  });
  
  return errors;
}

// Convert string values to appropriate types
export function convertDataTypes(data: any[], table: keyof typeof TABLE_SCHEMAS): any[] {
  const schema = TABLE_SCHEMAS[table];
  
  return data.map(row => {
    const converted: any = {};
    
    Object.entries(row).forEach(([key, value]) => {
      const type = schema.types[key as keyof typeof schema.types];
      
      if (type === 'number') {
        converted[key] = value ? Number(value) : null;
      } else if (type === 'boolean') {
        converted[key] = ['true', '1', 'yes'].includes(String(value).toLowerCase());
      } else if (type === 'date') {
        converted[key] = value ? new Date(value).toISOString().split('T')[0] : null;
      } else {
        converted[key] = value;
      }
    });
    
    // Add default values for required fields if missing
    if (table === 'participants') {
      converted.approved = converted.approved ?? false;
      converted.contractSigned = converted.contractSigned ?? false;
      converted.signedSyllabus = converted.signedSyllabus ?? false;
      converted.idProvided = converted.idProvided ?? false;
      converted.proofOfAffiliationWithSCD = converted.proofOfAffiliationWithSCD ?? false;
      converted.availability = converted.availability ?? '';
      converted.assignedMentor = converted.assignedMentor ?? '';
      converted.canadianStatusOther = converted.canadianStatusOther ?? '';
      converted.sinLast4 = converted.sinLast4 ?? '';
      converted.sinHash = converted.sinHash ?? '';
      converted.youthProposal = converted.youthProposal ?? '';
      converted.scagoCounterpart = converted.scagoCounterpart ?? '';
      converted.interviewed = converted.interviewed ?? false;
      converted.recruited = converted.recruited ?? false;
    }
    
    return converted;
  });
}

// Generate field mapping suggestions
export function generateMappingSuggestions(
  csvHeaders: string[], 
  table: keyof typeof TABLE_SCHEMAS
): ImportMapping {
  const schema = TABLE_SCHEMAS[table];
  const mapping: ImportMapping = {};
  
  // Try to match headers to schema fields
  csvHeaders.forEach(header => {
    const lowerHeader = header.toLowerCase();
    
    // Direct matches
    if (schema.required.includes(header) || schema.optional.includes(header)) {
      mapping[header] = header;
      return;
    }
    
    // Fuzzy matches - comprehensive mapping for all YEP fields
    const fuzzyMatches: { [key: string]: string[] } = {
      'youthParticipant': ['name', 'participant', 'youth', 'student', 'participant name', 'full name', 'fullname', 'full_name'],
      'email': ['email', 'email_address', 'e_mail', 'e-mail'],
      'etransferEmailAddress': ['etransfer', 'e-transfer', 'transfer email', 'payment email', 'etransfer_email'],
      'mailingAddress': ['address', 'mailing', 'postal', 'street', 'home address', 'mailing_address'],
      'phoneNumber': ['phone', 'telephone', 'mobile', 'cell', 'contact number', 'phone_number'],
      'region': ['region', 'province', 'state', 'location'],
      'approved': ['approved', 'status', 'active', 'enrolled'],
      'contractSigned': ['contract', 'signed', 'agreement', 'contract_signed'],
      'signedSyllabus': ['syllabus', 'signed syllabus', 'course agreement', 'signed_syllabus'],
      'availability': ['availability', 'schedule', 'time', 'when available'],
      'assignedMentor': ['mentor', 'assigned mentor', 'supervisor', 'assigned_mentor'],
      'idProvided': ['id', 'identification', 'id provided', 'documents', 'id_provided'],
      'canadianStatus': ['citizenship', 'canadian', 'status', 'citizen', 'canadian_status'],
      'canadianStatusOther': ['other status', 'citizenship other', 'non-canadian', 'canadian_status_other'],
      'sin': ['sin', 'social insurance', 'sin number', 'ssn'],
      'youthProposal': ['proposal', 'project', 'idea', 'youth proposal', 'youth_proposal'],
      'proofOfAffiliationWithSCD': ['affiliation', 'scd', 'proof', 'connection', 'proof_of_affiliation'],
      'scagoCounterpart': ['counterpart', 'scago', 'partner', 'scago_counterpart'],
      'dob': ['dob', 'date of birth', 'birthday', 'birth date', 'date_of_birth'],
      'age': ['age', 'years old', 'years_old'],
      'citizenshipStatus': ['citizenship', 'citizen status', 'immigration', 'citizenship_status'],
      'location': ['location', 'city', 'town', 'place'],
      'projectCategory': ['category', 'project type', 'field', 'project_category'],
      'duties': ['duties', 'responsibilities', 'tasks'],
      'affiliationWithSCD': ['scd affiliation', 'scd connection', 'scd relationship', 'affiliation_with_scd'],
      'notes': ['notes', 'comments', 'remarks', 'additional'],
      'nextSteps': ['next steps', 'follow up', 'action items', 'next_steps'],
      'interviewed': ['interviewed', 'interview', 'meeting'],
      'interviewNotes': ['interview notes', 'meeting notes', 'interview comments', 'interview_notes'],
      'recruited': ['recruited', 'recruitment', 'source'],
      'title': ['title', 'job_title', 'position'],
      'date': ['date', 'workshop_date', 'meeting_date'],
      'description': ['description', 'desc', 'details']
    };
    
    Object.entries(fuzzyMatches).forEach(([schemaField, variations]) => {
      if (variations.some(variation => 
        lowerHeader.includes(variation.toLowerCase()) || 
        variation.toLowerCase().includes(lowerHeader)
      )) {
        mapping[header] = schemaField;
      }
    });
  });
  
  return mapping;
}

// Generate import preview
export function generateImportPreview(
  data: any[], 
  table: keyof typeof TABLE_SCHEMAS,
  mapping: ImportMapping
): ImportPreview {
  const headers = Object.keys(data[0] || {});
  const sampleData = data.slice(0, 5); // First 5 rows as preview
  const validationErrors = validateData(data, table);
  
  return {
    headers,
    sampleData,
    totalRows: data.length,
    mapping,
    validationErrors
  };
}

// Generate import filename
export function generateImportFilename(table: string, format: string): string {
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  return `${table}-import-${timestamp}.${format}`;
}

// Check for duplicate records
export function checkDuplicates(
  data: any[], 
  table: keyof typeof TABLE_SCHEMAS,
  existingData: any[]
): { [key: string]: number[] } {
  const duplicates: { [key: string]: number[] } = {};
  
  // Define unique identifiers for each table
  const uniqueFields: { [key: string]: string[] } = {
    participants: ['email'],
    mentors: ['email'],
    workshops: ['title', 'date'],
    attendance: ['participantId', 'workshopId'],
    meetings: ['participantId', 'mentorId', 'meetingDate']
  };
  
  const fields = uniqueFields[table] || ['id'];
  
  data.forEach((row, index) => {
    const key = fields.map(field => row[field]).join('|');
    const existingMatch = existingData.find(existing => 
      fields.every(field => existing[field] === row[field])
    );
    
    if (existingMatch) {
      if (!duplicates[key]) {
        duplicates[key] = [];
      }
      duplicates[key].push(index + 1);
    }
  });
  
  return duplicates;
}
