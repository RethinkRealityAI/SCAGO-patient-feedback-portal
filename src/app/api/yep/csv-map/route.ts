import { NextRequest } from 'next/server';
import { z } from 'zod';

// Helper function for Levenshtein distance calculation
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
  
  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
  
  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,     // deletion
        matrix[j - 1][i] + 1,     // insertion
        matrix[j - 1][i - 1] + indicator // substitution
      );
    }
  }
  
  return matrix[str2.length][str1.length];
}

// Helper function to analyze data type from sample data
function analyzeDataType(sampleData: string[]): string {
  if (sampleData.length === 0) return 'unknown';
  
  const sample = sampleData[0];
  
  // Email pattern
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sample)) return 'email';
  
  // Phone pattern
  if (/^[\+]?[1-9][\d]{0,15}$/.test(sample.replace(/[\s\-\(\)]/g, ''))) return 'phone';
  
  // Date pattern
  if (/^\d{4}-\d{2}-\d{2}$/.test(sample) || /^\d{2}\/\d{2}\/\d{4}$/.test(sample)) return 'date';
  
  // Boolean pattern
  if (/^(true|false|yes|no|y|n|1|0|approved|pending)$/i.test(sample)) return 'boolean';
  
  // Number pattern
  if (/^\d+$/.test(sample)) return 'number';
  
  // URL pattern
  if (/^https?:\/\//.test(sample)) return 'url';
  
  return 'text';
}

// Helper function to get expected data type for a field
function getExpectedDataType(field: string): string {
  const typeMap: Record<string, string> = {
    youthParticipant: 'text',
    age: 'number',
    email: 'email',
    etransferEmailAddress: 'email',
    phoneNumber: 'phone',
    emergencyContactRelationship: 'text',
    emergencyContactNumber: 'phone',
    region: 'text',
    mailingAddress: 'text',
    projectCategory: 'text',
    projectInANutshell: 'text',
    contractSigned: 'boolean',
    signedSyllabus: 'boolean',
    availability: 'text',
    assignedMentor: 'text',
    idProvided: 'boolean',
    canadianStatus: 'text',
    sin: 'text',
    sinNumber: 'text',
    youthProposal: 'text',
    affiliationWithSCD: 'text',
    proofOfAffiliationWithSCD: 'boolean',
    scagoCounterpart: 'text',
    dob: 'date',
    file: 'text',
    // Additional fields
    approved: 'boolean',
    canadianStatusOther: 'text',
    citizenshipStatus: 'text',
    location: 'text',
    duties: 'text',
    notes: 'text',
    nextSteps: 'text',
    interviewed: 'boolean',
    interviewNotes: 'text',
    recruited: 'boolean'
  };
  
  return typeMap[field] || 'text';
}

const CsvMappingInputSchema = z.object({
  headers: z.array(z.string()).describe('CSV column headers'),
  sampleRows: z.array(z.record(z.string(), z.string())).min(1).max(5).describe('Up to 5 sample rows as objects'),
});

const CsvMappingOutputSchema = z.object({
  mapping: z.record(z.string(), z.string()).describe('Map CSV header -> YEP participant field'),
  notes: z.string().optional(),
});

// Enhanced AI-powered mapping with intelligent field detection
function suggestParticipantCsvMapping(input: z.infer<typeof CsvMappingInputSchema>) {
  const mapping: Record<string, string> = {};
  const notes: string[] = [];

  // Enhanced mapping rules with more variations and context awareness
  const fieldMappings: Record<string, string[]> = {
    youthParticipant: [
      'name', 'participant', 'youth', 'student', 'participant name', 'full name',
      'youth participant', 'participant name', 'fullname', 'first name', 'last name',
      'given name', 'surname', 'family name', 'complete name', 'entire name',
      'youth participants', 'participant', 'youth participant'
    ],
    email: [
      'email', 'e-mail', 'email address', 'e-mail address', 'mail', 'electronic mail',
      'contact email', 'primary email', 'email id', 'email_id', 'emailaddress'
    ],
    age: [
      'age', 'years old', 'age_years', 'current_age', 'age_in_years', 'years',
      'age group', 'age_range', 'age category', 'age_bracket', 'age_class'
    ],
    etransferEmailAddress: [
      'etransfer', 'e-transfer', 'transfer email', 'payment email', 'etransfer email',
      'e transfer', 'electronic transfer', 'money transfer email', 'payment address',
      'e-tranfer email address', 'etransfer email address', 'transfer email address'
    ],
    phoneNumber: [
      'phone', 'telephone', 'mobile', 'cell', 'contact number', 'phone number',
      'mobile number', 'cell phone', 'telephone number', 'contact', 'phone_no',
      'mobile_phone', 'cell_phone', 'telephone_no', 'contact_phone', 'phone number'
    ],
    emergencyContactRelationship: [
      'emergency contact relationship', 'emergency contact', 'emergency relationship',
      'contact relationship', 'emergency contact rel', 'emergency rel'
    ],
    emergencyContactNumber: [
      'emergency contact number', 'emergency contact phone', 'emergency phone',
      'emergency number', 'emergency contact no', 'emergency phone number'
    ],
    mailingAddress: [
      'address', 'mailing', 'postal', 'street', 'home address', 'mailing address',
      'postal address', 'street address', 'home', 'residence', 'location address',
      'physical address', 'mail address', 'postal code', 'zip code'
    ],
    phoneNumber: [
      'phone', 'telephone', 'mobile', 'cell', 'contact number', 'phone number',
      'mobile number', 'cell phone', 'telephone number', 'contact', 'phone_no',
      'mobile_phone', 'cell_phone', 'telephone_no', 'contact_phone'
    ],
    region: [
      'region', 'province', 'state', 'location', 'geographic region', 'area',
      'territory', 'jurisdiction', 'administrative region', 'geographic area',
      'provincial', 'regional', 'location region', 'geographic location',
      'region_name', 'province_name', 'state_name', 'location_name'
    ],
    approved: [
      'approved', 'status', 'active', 'enrolled', 'accepted', 'confirmed',
      'verified', 'validated', 'authorized', 'cleared', 'passed', 'qualified',
      'eligible', 'admitted', 'registered', 'enrolled status'
    ],
    contractSigned: [
      'contract', 'signed', 'agreement', 'contract signed', 'signed contract',
      'agreement signed', 'contractual agreement', 'legal agreement', 'signed agreement',
      'contract status', 'agreement status', 'signed status', 'contractual'
    ],
    signedSyllabus: [
      'syllabus', 'signed syllabus', 'course agreement', 'syllabus signed',
      'course syllabus', 'program syllabus', 'curriculum agreement', 'syllabus status',
      'course agreement signed', 'program agreement', 'curriculum signed'
    ],
    availability: [
      'availability', 'schedule', 'time', 'when available', 'available times',
      'schedule availability', 'time availability', 'available hours', 'free time',
      'schedule preferences', 'time preferences', 'availability schedule'
    ],
    assignedMentor: [
      'mentor', 'assigned mentor', 'supervisor', 'mentor assigned', 'supervisor assigned',
      'mentor name', 'supervisor name', 'assigned supervisor', 'mentor assignment',
      'supervisor assignment', 'mentor_id', 'supervisor_id', 'assigned_to'
    ],
    idProvided: [
      'id', 'identification', 'id provided', 'documents', 'id documents', 'identification provided',
      'id status', 'documentation', 'id verification', 'identification status',
      'documents provided', 'id_verified', 'identification_verified'
    ],
    canadianStatus: [
      'citizenship', 'canadian', 'status', 'citizen', 'canadian status', 'citizenship status',
      'citizen status', 'immigration status', 'residency status', 'citizenship type',
      'canadian citizen', 'citizen type', 'immigration', 'residency'
    ],
    canadianStatusOther: [
      'other status', 'citizenship other', 'non-canadian', 'other citizenship',
      'alternative status', 'other immigration status', 'non-citizen status',
      'other residency', 'alternative citizenship', 'other citizen type'
    ],
    sin: [
      'sin', 'social insurance', 'sin number', 'ssn', 'social insurance number',
      'sin_code', 'social_security', 'insurance_number', 'sin_no', 'ssn_number',
      'social_insurance_no', 'insurance_code', 'sin_id'
    ],
    youthProposal: [
      'proposal', 'project', 'idea', 'youth proposal', 'project proposal',
      'youth project', 'proposed project', 'project idea', 'youth idea',
      'proposal description', 'project description', 'youth project idea'
    ],
    proofOfAffiliationWithSCD: [
      'affiliation', 'scd', 'proof', 'connection', 'scd affiliation', 'scd proof',
      'affiliation proof', 'scd connection', 'scd relationship', 'scd affiliation proof',
      'sickle cell affiliation', 'scd connection proof', 'affiliation with scd'
    ],
    scagoCounterpart: [
      'counterpart', 'scago', 'partner', 'scago counterpart', 'scago partner',
      'counterpart name', 'partner name', 'scago contact', 'scago representative',
      'scago counterpart name', 'scago partner name', 'scago_contact'
    ],
    dob: [
      'dob', 'date of birth', 'birthday', 'birth date', 'date_of_birth', 'birthday_date',
      'birth_date', 'date_of_birth', 'birthday_date', 'birthday', 'born', 'birth',
      'date born', 'birthday date', 'date of birth', 'birthday_date'
    ],
    age: [
      'age', 'years old', 'age_years', 'current_age', 'age_in_years', 'years',
      'age group', 'age_range', 'age category', 'age_bracket', 'age_class'
    ],
    citizenshipStatus: [
      'citizenship', 'citizen status', 'immigration', 'citizenship status',
      'immigration status', 'citizen type', 'citizenship type', 'residency',
      'residency status', 'immigration type', 'citizenship_category'
    ],
    location: [
      'location', 'city', 'town', 'place', 'geographic location', 'physical location',
      'current location', 'residence location', 'home location', 'address location',
      'city_name', 'town_name', 'place_name', 'location_name'
    ],
    projectCategory: [
      'category', 'project type', 'field', 'project category', 'category type',
      'project field', 'category field', 'project classification', 'category_class',
      'project_type', 'field_type', 'category_type', 'project_field'
    ],
    projectInANutshell: [
      'project in a nutshell', 'project nutshell', 'project summary', 'project description',
      'project overview', 'project brief', 'project outline', 'project details',
      'nutshell', 'summary', 'description', 'overview'
    ],
    sinNumber: [
      'sin #', 'sin number', 'sin_no', 'sin_number', 'social insurance number',
      'social insurance no', 'sin code', 'sin id', 'ssn number'
    ],
    affiliationWithSCD: [
      'affiliation with scd', 'scd affiliation', 'scd connection', 'scd relationship',
      'sickle cell affiliation', 'scd connection type', 'scd relationship type',
      'scd_affiliation', 'scd_connection', 'scd_relationship', 'sickle_cell_affiliation'
    ],
    file: [
      'file', 'files', 'document', 'documents', 'attachment', 'attachments',
      'upload', 'uploads', 'file upload', 'document upload'
    ],
    duties: [
      'duties', 'responsibilities', 'tasks', 'job duties', 'role duties',
      'responsibility', 'task list', 'job responsibilities', 'role responsibilities',
      'duty_list', 'responsibility_list', 'task_list', 'job_duties'
    ],
    affiliationWithSCD: [
      'scd affiliation', 'scd connection', 'scd relationship', 'affiliation with scd',
      'sickle cell affiliation', 'scd connection type', 'scd relationship type',
      'scd_affiliation', 'scd_connection', 'scd_relationship', 'sickle_cell_affiliation'
    ],
    notes: [
      'notes', 'comments', 'remarks', 'additional', 'additional notes', 'comments notes',
      'remarks notes', 'additional comments', 'extra notes', 'supplementary notes',
      'note', 'comment', 'remark', 'additional_info', 'extra_info'
    ],
    nextSteps: [
      'next steps', 'follow up', 'action items', 'next actions', 'follow-up',
      'action plan', 'next actions', 'follow up items', 'action items list',
      'next_steps', 'follow_up', 'action_items', 'next_actions'
    ],
    interviewed: [
      'interviewed', 'interview', 'meeting', 'interview status', 'interviewed status',
      'interview completed', 'interview done', 'interviewed_flag', 'interview_status',
      'interview_completed', 'interview_done', 'interview_flag'
    ],
    interviewNotes: [
      'interview notes', 'meeting notes', 'interview comments', 'interview remarks',
      'interview feedback', 'interview summary', 'interview details', 'interview_record',
      'meeting_comments', 'interview_comments', 'interview_feedback'
    ],
    recruited: [
      'recruited', 'recruitment', 'source', 'recruitment source', 'recruited from',
      'recruitment method', 'recruitment channel', 'recruitment_source',
      'recruited_flag', 'recruitment_status', 'recruitment_method'
    ]
  };

  // Create reverse mapping for easier lookup
  const reverseMapping: Record<string, string> = {};
  Object.entries(fieldMappings).forEach(([field, variations]) => {
    variations.forEach(variation => {
      reverseMapping[variation.toLowerCase()] = field;
    });
  });

  // Enhanced intelligent mapping with data analysis
  input.headers.forEach(header => {
    const headerLower = header.toLowerCase().trim();
    let bestMatch = '';
    let bestScore = 0;
    
    // Direct match (highest priority)
    if (reverseMapping[headerLower]) {
      mapping[header] = reverseMapping[headerLower];
      return;
    }

    // Intelligent fuzzy matching with scoring
    for (const [field, variations] of Object.entries(fieldMappings)) {
      let fieldScore = 0;
      
      for (const variation of variations) {
        const variationLower = variation.toLowerCase();
        
        // Exact substring match (high score)
        if (headerLower.includes(variationLower) || variationLower.includes(headerLower)) {
          fieldScore += 10;
        }
        
        // Word boundary matches (medium score)
        const headerWords = headerLower.split(/[\s_-]+/);
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
        
        // Levenshtein distance for close matches (low score)
        if (headerLower.length > 3 && variationLower.length > 3) {
          const distance = levenshteinDistance(headerLower, variationLower);
          const maxLength = Math.max(headerLower.length, variationLower.length);
          const similarity = 1 - (distance / maxLength);
          if (similarity > 0.7) {
            fieldScore += similarity * 2;
          }
        }
      }
      
      if (fieldScore > bestScore) {
        bestScore = fieldScore;
        bestMatch = field;
      }
    }

    // Data type analysis for better matching
    if (bestScore > 0) {
      const sampleData = input.sampleRows.map(row => row[header]).filter(Boolean);
      const dataType = analyzeDataType(sampleData);
      const expectedType = getExpectedDataType(bestMatch);
      
      if (dataType === expectedType) {
        bestScore += 5; // Boost score for matching data types
      }
    }

    if (bestScore >= 3) { // Minimum threshold for mapping
      mapping[header] = bestMatch;
    } else {
      notes.push(`No confident mapping found for "${header}" (best match: ${bestMatch}, score: ${bestScore.toFixed(1)})`);
    }
  });

  return {
    mapping,
    notes: notes.length > 0 ? notes.join('; ') : 'All headers mapped successfully'
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = CsvMappingInputSchema.parse(body);

    const result = suggestParticipantCsvMapping(parsed);
    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid request';
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}


