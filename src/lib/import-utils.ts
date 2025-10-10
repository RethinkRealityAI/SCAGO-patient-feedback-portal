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
    required: ['youthParticipant'], // Only name is required
    optional: [
      'age', 'email', 'etransferEmailAddress', 'phoneNumber', 'emergencyContactRelationship',
      'emergencyContactNumber', 'region', 'mailingAddress', 'projectCategory', 'projectInANutshell',
      'contractSigned', 'signedSyllabus', 'availability', 'assignedMentor', 'idProvided',
      'canadianStatus', 'sin', 'sinNumber', 'sinLast4', 'sinHash', 'youthProposal',
      'affiliationWithSCD', 'proofOfAffiliationWithSCD', 'scagoCounterpart', 'dob', 'file',
      'approved', 'canadianStatusOther', 'citizenshipStatus', 'location', 'duties',
      'notes', 'nextSteps', 'interviewed', 'interviewNotes', 'recruited',
      'fileUrl', 'fileName', 'fileType'
    ],
    types: {
      youthParticipant: 'string',
      age: 'number',
      email: 'email',
      etransferEmailAddress: 'email',
      phoneNumber: 'phone',
      emergencyContactRelationship: 'string',
      emergencyContactNumber: 'phone',
      region: 'string',
      mailingAddress: 'string',
      projectCategory: 'string',
      projectInANutshell: 'string',
      contractSigned: 'boolean',
      signedSyllabus: 'boolean',
      availability: 'string',
      assignedMentor: 'string',
      idProvided: 'boolean',
      canadianStatus: 'enum:Canadian Citizen,Permanent Resident,Other',
      sin: 'string',
      sinNumber: 'string',
      youthProposal: 'string',
      affiliationWithSCD: 'string',
      proofOfAffiliationWithSCD: 'boolean',
      scagoCounterpart: 'string',
      dob: 'date',
      file: 'string',
      approved: 'boolean',
      interviewed: 'boolean',
      recruited: 'boolean'
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
        converted[key] = value ? new Date(String(value)).toISOString().split('T')[0] : null;
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

// Helper function to safely handle empty data
export function sanitizeEmptyData(data: any): any {
  if (data === null || data === undefined) return '';
  if (typeof data === 'string' && data.trim() === '') return '';
  if (typeof data === 'boolean') return data;
  if (typeof data === 'number') return data;
  return data;
}

// Helper function to provide safe defaults for required fields
export function getSafeDefaults(): Record<string, any> {
  return {
    youthParticipant: '',
    email: '',
    region: '',
    dob: '',
    canadianStatus: 'Other',
    contractSigned: false,
    signedSyllabus: false,
    availability: '',
    assignedMentor: '',
    idProvided: false,
    proofOfAffiliationWithSCD: false,
    scagoCounterpart: '',
    youthProposal: '',
    approved: false,
    canadianStatusOther: '',
    sinLast4: '',
    sinHash: '',
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

// Enhanced field mapping suggestions with intelligent matching
export function generateMappingSuggestions(
  csvHeaders: string[], 
  table: keyof typeof TABLE_SCHEMAS
): ImportMapping {
  const schema = TABLE_SCHEMAS[table];
  const mapping: ImportMapping = {};
  
  // Enhanced fuzzy matching with more comprehensive patterns
  const fuzzyMatches: { [key: string]: string[] } = {
    // Core participant fields
    'youthParticipant': ['name', 'participant', 'youth', 'student', 'participant name', 'full name', 'fullname', 'first name', 'last name', 'given name', 'surname', 'family name'],
    'email': ['email', 'e-mail', 'email address', 'e-mail address', 'mail', 'electronic mail', 'contact email', 'primary email', 'email id', 'email_id', 'emailaddress'],
    'etransferEmailAddress': ['etransfer', 'e-transfer', 'transfer email', 'payment email', 'etransfer email', 'e transfer', 'electronic transfer', 'money transfer email', 'payment address'],
    'mailingAddress': ['address', 'mailing', 'postal', 'street', 'home address', 'mailing address', 'postal address', 'street address', 'home', 'residence', 'location address', 'physical address', 'mail address', 'postal code', 'zip code'],
    'phoneNumber': ['phone', 'telephone', 'mobile', 'cell', 'contact number', 'phone number', 'mobile number', 'cell phone', 'telephone number', 'contact', 'phone_no', 'mobile_phone', 'cell_phone', 'telephone_no', 'contact_phone'],
    'region': ['region', 'province', 'state', 'location', 'geographic region', 'area', 'territory', 'jurisdiction', 'administrative region', 'geographic area', 'provincial', 'regional', 'location region', 'geographic location'],
    
    // Status and approval fields
    'approved': ['approved', 'status', 'active', 'enrolled', 'accepted', 'confirmed', 'verified', 'validated', 'authorized', 'cleared', 'passed', 'qualified', 'eligible', 'admitted', 'registered', 'enrolled status'],
    'contractSigned': ['contract', 'signed', 'agreement', 'contract signed', 'signed contract', 'agreement signed', 'contractual agreement', 'legal agreement', 'signed agreement', 'contract status', 'agreement status', 'signed status', 'contractual'],
    'signedSyllabus': ['syllabus', 'signed syllabus', 'course agreement', 'syllabus signed', 'course syllabus', 'program syllabus', 'curriculum agreement', 'syllabus status', 'course agreement signed', 'program agreement', 'curriculum signed'],
    'idProvided': ['id', 'identification', 'id provided', 'documents', 'id documents', 'identification provided', 'id status', 'documentation', 'id verification', 'identification status', 'documents provided', 'id_verified', 'identification_verified'],
    
    // Assignment and availability
    'availability': ['availability', 'schedule', 'time', 'when available', 'available times', 'schedule availability', 'time availability', 'available hours', 'free time', 'schedule preferences', 'time preferences', 'availability schedule'],
    'assignedMentor': ['mentor', 'assigned mentor', 'supervisor', 'mentor assigned', 'supervisor assigned', 'mentor name', 'supervisor name', 'assigned supervisor', 'mentor assignment', 'supervisor assignment', 'mentor_id', 'supervisor_id', 'assigned_to'],
    
    // Canadian status and citizenship
    'canadianStatus': ['citizenship', 'canadian', 'status', 'citizen', 'canadian status', 'citizenship status', 'citizen status', 'immigration status', 'residency status', 'citizenship type', 'canadian citizen', 'citizen type', 'immigration', 'residency'],
    'canadianStatusOther': ['other status', 'citizenship other', 'non-canadian', 'other citizenship', 'alternative status', 'other immigration status', 'non-citizen status', 'other residency', 'alternative citizenship', 'other citizen type'],
    'citizenshipStatus': ['citizenship', 'citizen status', 'immigration', 'citizenship status', 'immigration status', 'citizen type', 'citizenship type', 'residency', 'residency status', 'immigration type', 'citizenship_category'],
    
    // Personal information
    'dob': ['dob', 'date of birth', 'birthday', 'birth date', 'date_of_birth', 'birthday_date', 'birth_date', 'date_of_birth', 'birthday_date', 'birthday', 'born', 'birth', 'date born', 'birthday date', 'date of birth', 'birthday_date'],
    'age': ['age', 'years old', 'age_years', 'current_age', 'age_in_years', 'years', 'age group', 'age_range', 'age category', 'age_bracket', 'age_class'],
    'sin': ['sin', 'social insurance', 'sin number', 'ssn', 'social insurance number', 'sin_code', 'social_security', 'insurance_number', 'sin_no', 'ssn_number', 'social_insurance_no', 'insurance_code', 'sin_id'],
    
    // Project and affiliation
    'youthProposal': ['proposal', 'project', 'idea', 'youth proposal', 'project proposal', 'youth project', 'proposed project', 'project idea', 'youth idea', 'proposal description', 'project description', 'youth project idea'],
    'proofOfAffiliationWithSCD': ['affiliation', 'scd', 'proof', 'connection', 'scd affiliation', 'scd proof', 'affiliation proof', 'scd connection', 'scd relationship', 'scd affiliation proof', 'sickle cell affiliation', 'scd connection proof', 'affiliation with scd'],
    'scagoCounterpart': ['counterpart', 'scago', 'partner', 'scago counterpart', 'scago partner', 'counterpart name', 'partner name', 'scago contact', 'scago representative', 'scago counterpart name', 'scago partner name', 'scago_contact'],
    'affiliationWithSCD': ['scd affiliation', 'scd connection', 'scd relationship', 'affiliation with scd', 'sickle cell affiliation', 'scd connection type', 'scd relationship type', 'scd_affiliation', 'scd_connection', 'scd_relationship', 'sickle_cell_affiliation'],
    
    // Location and project details
    'location': ['location', 'city', 'town', 'place', 'geographic location', 'physical location', 'current location', 'residence location', 'home location', 'address location', 'city_name', 'town_name', 'place_name', 'location_name'],
    'projectCategory': ['category', 'project type', 'field', 'project category', 'category type', 'project field', 'category field', 'project classification', 'category_class', 'project_type', 'field_type', 'category_type', 'project_field'],
    'duties': ['duties', 'responsibilities', 'tasks', 'job duties', 'role duties', 'responsibility', 'task list', 'job responsibilities', 'role responsibilities', 'duty_list', 'responsibility_list', 'task_list', 'job_duties'],
    
    // Notes and follow-up
    'notes': ['notes', 'comments', 'remarks', 'additional', 'additional notes', 'comments notes', 'remarks notes', 'additional comments', 'extra notes', 'supplementary notes', 'note', 'comment', 'remark', 'additional_info', 'extra_info'],
    'nextSteps': ['next steps', 'follow up', 'action items', 'next actions', 'follow-up', 'action plan', 'next actions', 'follow up items', 'action items list', 'next_steps', 'follow_up', 'action_items', 'next_actions'],
    
    // Interview and recruitment
    'interviewed': ['interviewed', 'interview', 'meeting', 'interview status', 'interviewed status', 'interview completed', 'interview done', 'interviewed_flag', 'interview_status', 'interview_completed', 'interview_done', 'interview_flag'],
    'interviewNotes': ['interview notes', 'meeting notes', 'interview comments', 'interview remarks', 'interview feedback', 'interview summary', 'interview details', 'interview_record', 'meeting_comments', 'interview_comments', 'interview_feedback'],
    'recruited': ['recruited', 'recruitment', 'source', 'recruitment source', 'recruited from', 'recruitment method', 'recruitment channel', 'recruitment_source', 'recruited_flag', 'recruitment_status', 'recruitment_method']
  };
  
  // Try to match headers to schema fields
  csvHeaders.forEach(header => {
    const lowerHeader = header.toLowerCase().trim();
    
    // Direct matches (highest priority)
    if (schema.required.includes(header) || schema.optional.includes(header)) {
      mapping[header] = header;
      return;
    }
    
    // Enhanced fuzzy matching with scoring
    let bestMatch = '';
    let bestScore = 0;
    
    Object.entries(fuzzyMatches).forEach(([schemaField, variations]) => {
      let fieldScore = 0;
      
      for (const variation of variations) {
        const variationLower = variation.toLowerCase();
        
        // Exact match (highest score)
        if (lowerHeader === variationLower) {
          fieldScore += 20;
        }
        // Substring match (high score)
        else if (lowerHeader.includes(variationLower) || variationLower.includes(lowerHeader)) {
          fieldScore += 10;
        }
        // Word boundary match (medium score)
        else {
          const headerWords = lowerHeader.split(/[\s_-]+/);
          const variationWords = variationLower.split(/[\s_-]+/);
          
          for (const hWord of headerWords) {
            for (const vWord of variationWords) {
              if (hWord === vWord && hWord.length > 2) {
                fieldScore += 5;
              } else if (hWord.includes(vWord) || vWord.includes(hWord)) {
                fieldScore += 3;
              }
            }
          }
        }
      }
      
      if (fieldScore > bestScore) {
        bestScore = fieldScore;
        bestMatch = schemaField;
      }
    });
    
    // Only map if we have a confident match
    if (bestScore >= 5) {
      mapping[header] = bestMatch;
    }
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
