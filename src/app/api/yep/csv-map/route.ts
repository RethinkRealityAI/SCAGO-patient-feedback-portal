import { NextRequest } from 'next/server';
import { z } from 'zod';
import { suggestParticipantCsvMapping, CsvMappingInputSchema } from '@/ai/flows/csv-participant-mapper-flow';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = CsvMappingInputSchema.parse(body);

    const result = await suggestParticipantCsvMapping(parsed);
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


