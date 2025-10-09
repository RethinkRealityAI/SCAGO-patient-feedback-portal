import { NextRequest } from 'next/server';
import { z } from 'zod';

const CsvMappingInputSchema = z.object({
  headers: z.array(z.string()).describe('CSV column headers'),
  sampleRows: z.array(z.record(z.string(), z.string())).min(1).max(5).describe('Up to 5 sample rows as objects'),
});

const CsvMappingOutputSchema = z.object({
  mapping: z.record(z.string(), z.string()).describe('Map CSV header -> YEP participant field'),
  notes: z.string().optional(),
});

// Simple rule-based mapping without AI
function suggestParticipantCsvMapping(input: z.infer<typeof CsvMappingInputSchema>) {
  const mapping: Record<string, string> = {};
  const notes: string[] = [];

  // Define mapping rules
  const fieldMappings: Record<string, string[]> = {
    youthParticipant: ['name', 'participant', 'youth', 'student', 'participant name', 'full name'],
    email: ['email', 'e-mail', 'email address'],
    etransferEmailAddress: ['etransfer', 'e-transfer', 'transfer email', 'payment email'],
    mailingAddress: ['address', 'mailing', 'postal', 'street', 'home address'],
    phoneNumber: ['phone', 'telephone', 'mobile', 'cell', 'contact number'],
    region: ['region', 'province', 'state', 'location'],
    approved: ['approved', 'status', 'active', 'enrolled'],
    contractSigned: ['contract', 'signed', 'agreement'],
    signedSyllabus: ['syllabus', 'signed syllabus', 'course agreement'],
    availability: ['availability', 'schedule', 'time', 'when available'],
    assignedMentor: ['mentor', 'assigned mentor', 'supervisor'],
    idProvided: ['id', 'identification', 'id provided', 'documents'],
    canadianStatus: ['citizenship', 'canadian', 'status', 'citizen'],
    canadianStatusOther: ['other status', 'citizenship other', 'non-canadian'],
    sin: ['sin', 'social insurance', 'sin number', 'ssn'],
    youthProposal: ['proposal', 'project', 'idea', 'youth proposal'],
    proofOfAffiliationWithSCD: ['affiliation', 'scd', 'proof', 'connection'],
    scagoCounterpart: ['counterpart', 'scago', 'partner'],
    dob: ['dob', 'date of birth', 'birthday', 'birth date'],
    age: ['age', 'years old'],
    citizenshipStatus: ['citizenship', 'citizen status', 'immigration'],
    location: ['location', 'city', 'town', 'place'],
    projectCategory: ['category', 'project type', 'field'],
    duties: ['duties', 'responsibilities', 'tasks'],
    affiliationWithSCD: ['scd affiliation', 'scd connection', 'scd relationship'],
    notes: ['notes', 'comments', 'remarks', 'additional'],
    nextSteps: ['next steps', 'follow up', 'action items'],
    interviewed: ['interviewed', 'interview', 'meeting'],
    interviewNotes: ['interview notes', 'meeting notes', 'interview comments'],
    recruited: ['recruited', 'recruitment', 'source']
  };

  // Create reverse mapping for easier lookup
  const reverseMapping: Record<string, string> = {};
  Object.entries(fieldMappings).forEach(([field, variations]) => {
    variations.forEach(variation => {
      reverseMapping[variation.toLowerCase()] = field;
    });
  });

  // Process each header
  input.headers.forEach(header => {
    const headerLower = header.toLowerCase().trim();
    
    // Direct match
    if (reverseMapping[headerLower]) {
      mapping[header] = reverseMapping[headerLower];
      return;
    }

    // Partial match
    for (const [field, variations] of Object.entries(fieldMappings)) {
      for (const variation of variations) {
        if (headerLower.includes(variation.toLowerCase()) || variation.toLowerCase().includes(headerLower)) {
          mapping[header] = field;
          return;
        }
      }
    }

    // No match found
    notes.push(`No mapping found for "${header}"`);
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


