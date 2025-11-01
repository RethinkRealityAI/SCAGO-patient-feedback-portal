import { NextResponse } from 'next/server';
import { enforceAdminInAction } from '@/lib/server-auth';
import { migrateMentorAssignmentsToIds } from '@/app/youth-empowerment/migrate-mentor-assignments';

export async function POST() {
  try {
    await enforceAdminInAction();
    const result = await migrateMentorAssignmentsToIds();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Migration failed' },
      { status: 500 }
    );
  }
}



