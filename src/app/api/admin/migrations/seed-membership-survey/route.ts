import { NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { getServerSession } from '@/lib/server-auth';
import {
  MEMBERSHIP_SURVEY_ID,
  MEMBERSHIP_SURVEY_TEMPLATE_VERSION,
  createSeededMembershipSurvey,
} from '@/lib/survey-template';

/**
 * POST /api/admin/migrations/seed-membership-survey
 * GET  /api/admin/migrations/seed-membership-survey
 *
 * Seeds the SCAGO Membership Registration survey if it does not already exist.
 * Uses a fixed document ID so the operation is idempotent — calling it multiple
 * times will never create duplicate surveys.
 *
 * GET  → status check only (does the survey exist?)
 * POST → create if missing, return status
 */

async function requireAdminSession() {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  if (session.role !== 'admin' && session.role !== 'super-admin') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }
  return null;
}

export async function GET() {
  try {
    const authError = await requireAdminSession();
    if (authError) return authError;

    const firestore = getAdminFirestore();
    const snap = await firestore.collection('surveys').doc(MEMBERSHIP_SURVEY_ID).get();
    const templateVersion = snap.exists ? Number((snap.data() as any)?.templateVersion || 0) : null;
    return NextResponse.json({
      exists: snap.exists,
      surveyId: MEMBERSHIP_SURVEY_ID,
      templateVersion,
      latestTemplateVersion: MEMBERSHIP_SURVEY_TEMPLATE_VERSION,
      isOutdated: snap.exists ? templateVersion !== MEMBERSHIP_SURVEY_TEMPLATE_VERSION : false,
    });
  } catch (error) {
    return NextResponse.json({ exists: false, error: String(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authError = await requireAdminSession();
    if (authError) return authError;

    const force = new URL(request.url).searchParams.get('force') === 'true';
    const firestore = getAdminFirestore();
    const ref = firestore.collection('surveys').doc(MEMBERSHIP_SURVEY_ID);
    const snap = await ref.get();
    const existingVersion = snap.exists ? Number((snap.data() as any)?.templateVersion || 0) : 0;
    const isOutdated = snap.exists && existingVersion !== MEMBERSHIP_SURVEY_TEMPLATE_VERSION;

    if (snap.exists && !force && !isOutdated) {
      return NextResponse.json({
        success: true,
        created: false,
        message: 'Membership survey already exists.',
        surveyId: MEMBERSHIP_SURVEY_ID,
        templateVersion: existingVersion,
      });
    }

    await ref.set(createSeededMembershipSurvey());

    return NextResponse.json({
      success: true,
      created: !snap.exists,
      updated: snap.exists,
      forced: force,
      message: snap.exists
        ? 'Membership survey updated successfully.'
        : 'Membership survey seeded successfully.',
      surveyId: MEMBERSHIP_SURVEY_ID,
      templateVersion: MEMBERSHIP_SURVEY_TEMPLATE_VERSION,
    });
  } catch (error) {
    console.error('[seed-membership-survey]', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Seed failed' },
      { status: 500 },
    );
  }
}
