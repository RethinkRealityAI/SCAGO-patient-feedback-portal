/**
 * @fileOverview CSV participant mapping flow using AI to suggest field mappings.
 */
'use server';

import { ai, analysisModel, modelConfigs } from '@/ai/genkit';
import {
  AIFlowError,
  handleAIFlowError,
  withRetry,
  trackAIPerformance,
} from '@/ai/utils';
import {
  CsvMappingInputSchema,
  CsvMappingOutputSchema,
  type CsvMappingInput,
  type CsvMappingOutput,
} from './csv-participant-mapper-schemas';

export { CsvMappingInputSchema, CsvMappingOutputSchema };
export type { CsvMappingInput, CsvMappingOutput };

// Preprocess input to sanitize and validate
function preprocessCsvInput(input: CsvMappingInput): CsvMappingInput {
  return {
    headers: input.headers.map(h => h.trim().slice(0, 200)),
    sampleRows: input.sampleRows.map(row => {
      const sanitized: Record<string, string> = {};
      for (const [key, value] of Object.entries(row)) {
        sanitized[key.trim().slice(0, 500)] = String(value).slice(0, 1000);
      }
      return sanitized;
    }),
  };
}

const csvMappingPrompt = ai.definePrompt({
  name: 'csvMappingPrompt',
  model: analysisModel,
  input: { schema: CsvMappingInputSchema },
  output: { schema: CsvMappingOutputSchema },
  config: {
    ...modelConfigs.analysis,
  },
  prompt: `You are assisting in mapping a CSV of Youth Empowerment Program participants to the application's fields.

AVAILABLE TARGET FIELDS:
- youthParticipant (full name)
- email
- etransferEmailAddress (E-Transfer email)
- mailingAddress
- phoneNumber
- region
- approved
- contractSigned
- signedSyllabus
- availability
- assignedMentor
- idProvided
- canadianStatus
- canadianStatusOther
- sin (RAW INPUT - will be hashed downstream)
- youthProposal
- proofOfAffiliationWithSCD
- scagoCounterpart
- dob (date of birth)

MAPPING GUIDELINES:
- Prefer obvious matches (e.g., "Name"/"Full Name" -> youthParticipant, "DOB"/"Date of Birth" -> dob, "Phone"/"Phone Number" -> phoneNumber, "E-Transfer Email" -> etransferEmailAddress)
- If a column doesn't clearly match any target field, do not map it
- Return a JSON object with 'mapping' (CSV header -> target field) and optional 'notes'

CSV Headers:
{{{headers}}}

Sample Rows:
{{{sampleRows}}}`,
});

export const suggestParticipantCsvMapping = ai.defineFlow(
  {
    name: 'suggestParticipantCsvMapping',
    inputSchema: CsvMappingInputSchema,
    outputSchema: CsvMappingOutputSchema,
  },
  async (input) => {
    return trackAIPerformance('suggestParticipantCsvMapping', async () => {
      try {
        // Preprocess and sanitize input
        const sanitizedInput = preprocessCsvInput(input);
        
        const result = await withRetry(
          async () => {
            const { output } = await csvMappingPrompt(sanitizedInput);
            if (!output) {
              // Return empty mapping rather than throwing for this flow
              return { mapping: {}, notes: 'Model did not return a valid mapping. Please map manually.' };
            }
            return output;
          },
          {
            maxRetries: 2, // Fewer retries for mapping (not critical if it fails)
            initialDelayMs: 1000,
            onRetry: (attempt, error) => {
              console.warn(`[suggestParticipantCsvMapping] Retry attempt ${attempt}:`, error.message);
            },
          }
        );
        
        return result;
      } catch (error) {
        // For CSV mapping, we return a fallback rather than throwing
        // This allows the UI to still function and let users map manually
        console.error('[suggestParticipantCsvMapping] Error:', error);
        return { 
          mapping: {}, 
          notes: 'Failed to generate mapping suggestions. Please map columns manually.' 
        };
      }
    }, {
      flowName: 'suggestParticipantCsvMapping',
      inputSize: JSON.stringify(input).length,
    });
  }
);


