import { ai } from '@/ai/genkit';
import { gemini20Flash } from '@genkit-ai/googleai';
import { z } from 'zod';

// Define the schema for mapping suggestions
export const CsvMappingInputSchema = z.object({
  headers: z.array(z.string()).describe('CSV column headers'),
  sampleRows: z.array(z.record(z.string(), z.string())).min(1).max(5).describe('Up to 5 sample rows as objects'),
});

export const CsvMappingOutputSchema = z.object({
  mapping: z.record(z.string(), z.string()).describe('Map CSV header -> YEP participant field'),
  notes: z.string().optional(),
});

export type CsvMappingInput = z.infer<typeof CsvMappingInputSchema>;
export type CsvMappingOutput = z.infer<typeof CsvMappingOutputSchema>;

export const suggestParticipantCsvMapping = ai.defineFlow(
  {
    name: 'suggestParticipantCsvMapping',
    inputSchema: CsvMappingInputSchema,
    outputSchema: CsvMappingOutputSchema,
  },
  async (input) => {
    const system = `You are assisting in mapping a CSV of Youth Empowerment Program participants to the application's fields.
Return a JSON with keys 'mapping' and optional 'notes'.
Only use the following target field names: youthParticipant, email, etransferEmailAddress, mailingAddress, phoneNumber, region, approved, contractSigned, signedSyllabus, availability, assignedMentor, idProvided, canadianStatus, canadianStatusOther, sin (RAW INPUT - will be hashed downstream), youthProposal, proofOfAffiliationWithSCD, scagoCounterpart, dob.
Prefer obvious matches (e.g., "Name"->youthParticipant, "DOB"->dob, "Phone"->phoneNumber, "E-Transfer Email"->etransferEmailAddress).
If a column is unknown, do not map it. Do not hallucinate.`;

    const prompt = `${system}\n\nCSV Headers: ${JSON.stringify(input.headers)}\nSample Rows: ${JSON.stringify(input.sampleRows).slice(0, 4000)}`;

    const response = await ai.generate({ model: gemini20Flash, prompt });

    // Basic guard: try to parse JSON; on failure, return empty mapping
    try {
      const parsed = JSON.parse(response.text || '{}');
      const validated = CsvMappingOutputSchema.safeParse(parsed);
      if (validated.success) return validated.data;
    } catch (_) {}

    return { mapping: {}, notes: 'Model did not return a valid mapping.' };
  }
);


