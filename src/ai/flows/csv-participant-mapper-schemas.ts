/**
 * @fileOverview Shared schemas for CSV participant mapping.
 * Separated from the flow file to avoid Next.js build issues with 'use server' directive.
 */

import { z } from 'zod';

// Define the schema for mapping suggestions
export const CsvMappingInputSchema = z.object({
  headers: z.array(z.string())
    .min(1, 'At least one header is required')
    .max(100, 'Too many headers (max 100)')
    .describe('CSV column headers'),
  sampleRows: z.array(z.record(z.string(), z.string()))
    .min(1, 'At least one sample row is required')
    .max(5, 'Too many sample rows (max 5)')
    .describe('Up to 5 sample rows as objects'),
});

export const CsvMappingOutputSchema = z.object({
  mapping: z.record(z.string(), z.string())
    .describe('Map CSV header -> YEP participant field'),
  notes: z.string()
    .optional()
    .describe('Optional notes about the mapping suggestions'),
});

export type CsvMappingInput = z.infer<typeof CsvMappingInputSchema>;
export type CsvMappingOutput = z.infer<typeof CsvMappingOutputSchema>;
