/**
 * @fileOverview A flow for generating a summary report from feedback data.
 *
 * - generateReport - A function that takes a list of submissions and returns a markdown report.
 */
'use server';

import { ai, reportModel, modelConfigs } from '@/ai/genkit';
import { z } from 'zod';
import type { FeedbackSubmission } from '@/app/dashboard/types';
import {
  AIFlowError,
  handleAIFlowError,
  withRetry,
  trackAIPerformance,
} from '@/ai/utils';
import { estimateTokens } from '@/ai/utils/sanitization';

const GenerateReportInputSchema = z.object({
  submissions: z
    .string()
    .min(1, 'Submissions data cannot be empty')
    .max(200000, 'Submissions data is too large (max 200,000 characters)')
    .describe('A JSON string representing all the feedback submissions.'),
});

const GenerateReportOutputSchema = z.object({
  report: z
    .string()
    .describe('The AI-generated summary report in Markdown format.'),
});

// Preprocess input to check size
function preprocessReportInput(input: { submissions: string }): { submissions: string } {
  const tokens = estimateTokens(input.submissions);
  if (tokens > 64000) {
    console.warn('[generateReportFlow] Submissions data is very large, report generation may be slow or incomplete');
  }
  
  // Limit size to prevent issues
  return {
    submissions: input.submissions.slice(0, 200000),
  };
}

const generateReportPrompt = ai.definePrompt({
  name: 'generateReportPrompt',
  model: reportModel,
  input: { schema: GenerateReportInputSchema },
  output: { schema: GenerateReportOutputSchema },
  config: {
    ...modelConfigs.report,
  },
  prompt: `You are an expert healthcare data analyst. Your task is to generate a comprehensive summary report based on the provided patient feedback data for Sickle Cell Disease (SCD) care.

The report should be in Markdown format and include the following sections:

1. **Overall Summary**:
   - Total number of feedback submissions.
   - Overall average rating.
   - A brief, high-level summary of the key findings and trends from the feedback.

2. **Rating Analysis**:
   - A breakdown of the number of submissions for each star rating (1-5).
   - Identify any significant trends in the ratings.

3. **Key Themes and Topics**:
   - Analyze the feedback text to identify the most common positive and negative themes. (e.g., "Pain Management", "Wait Times", "Staff Empathy", "Medication Timeliness").
   - Provide examples or quotes for each theme.

4. **Hospital Performance**:
   - List the hospitals mentioned and the number of feedback entries for each.
   - Briefly summarize the feedback for the most-reviewed hospitals.

5. **Actionable Recommendations**:
   - Based on the analysis, provide 3-5 high-level, actionable recommendations for improving SCD care across the board.

Analyze the following data to generate the report:
{{{submissions}}}`,
});

const generateReportFlow = ai.defineFlow(
  {
    name: 'generateReportFlow',
    inputSchema: GenerateReportInputSchema,
    outputSchema: GenerateReportOutputSchema,
  },
  async (input) => {
    return trackAIPerformance('generateReportFlow', async () => {
      try {
        // Preprocess input
        const sanitizedInput = preprocessReportInput(input);
        
        const result = await withRetry(
          async () => {
            const { output } = await generateReportPrompt(sanitizedInput);
            if (!output) {
              throw new AIFlowError(
                'Model returned empty output',
                'generateReportFlow',
                undefined,
                { submissionsLength: sanitizedInput.submissions.length }
              );
            }
            return output;
          },
          {
            maxRetries: 2, // Fewer retries for report generation (it's expensive)
            initialDelayMs: 2000,
            onRetry: (attempt, error) => {
              console.warn(`[generateReportFlow] Retry attempt ${attempt}:`, error.message);
            },
          }
        );
        
        return result;
      } catch (error) {
        handleAIFlowError('generateReportFlow', error, { submissionsLength: input.submissions.length });
      }
    }, {
      flowName: 'generateReportFlow',
      inputSize: input.submissions.length,
    });
  }
);

export async function generateReport(
  submissions: FeedbackSubmission[]
): Promise<string> {
  const result = await generateReportFlow({
    submissions: JSON.stringify(submissions, null, 2),
  });
  return result.report;
}
