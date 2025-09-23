/**
 * @fileOverview A flow for generating a summary report from feedback data.
 *
 * - generateReport - A function that takes a list of submissions and returns a markdown report.
 */
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import type { FeedbackSubmission } from '@/app/dashboard/types';

const GenerateReportInputSchema = z.object({
  submissions: z
    .string()
    .describe('A JSON string representing all the feedback submissions.'),
});

const GenerateReportOutputSchema = z.object({
  report: z
    .string()
    .describe('The AI-generated summary report in Markdown format.'),
});

const generateReportPrompt = ai.definePrompt({
  name: 'generateReportPrompt',
  input: { schema: GenerateReportInputSchema },
  output: { schema: GenerateReportOutputSchema },
  prompt: `You are an expert healthcare data analyst. Your task is to generate a comprehensive summary report based on the provided patient feedback data for Sickle Cell Disease (SCD) care.

  The report should be in Markdown format and include the following sections:

  1.  **Overall Summary**:
      -   Total number of feedback submissions.
      -   Overall average rating.
      -   A brief, high-level summary of the key findings and trends from the feedback.

  2.  **Rating Analysis**:
      -   A breakdown of the number of submissions for each star rating (1-5).
      -   Identify any significant trends in the ratings.

  3.  **Key Themes and Topics**:
      -   Analyze the feedback text to identify the most common positive and negative themes. (e.g., "Pain Management", "Wait Times", "Staff Empathy", "Medication Timeliness").
      -   Provide examples or quotes for each theme.

  4.  **Hospital Performance**:
      -   List the hospitals mentioned and the number of feedback entries for each.
      -   Briefly summarize the feedback for the most-reviewed hospitals.

  5.  **Actionable Recommendations**:
      -   Based on the analysis, provide 3-5 high-level, actionable recommendations for improving SCD care across the board.

  Analyze the following data to generate the report:
  {{{submissions}}}
  `,
});

const generateReportFlow = ai.defineFlow(
  {
    name: 'generateReportFlow',
    inputSchema: GenerateReportInputSchema,
    outputSchema: GenerateReportOutputSchema,
  },
  async (input) => {
    const { output } = await generateReportPrompt(input);
    if (!output) {
      throw new Error('Failed to get a structured response from the model.');
    }
    return output;
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
