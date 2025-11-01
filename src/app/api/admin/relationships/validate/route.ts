import { NextResponse } from 'next/server';
import { enforceAdminInAction } from '@/lib/server-auth';
import { validateMentorParticipantRelationship } from '@/app/youth-empowerment/relationship-actions';

export async function POST() {
  try {
    await enforceAdminInAction();
    const result = await validateMentorParticipantRelationship();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Validation failed' },
      { status: 500 }
    );
  }
}



