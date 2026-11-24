import { NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { getServerSession } from '@/lib/server-auth';
import {
  CONTACT_FORM_DEFAULT_RECIPIENTS,
  CONTACT_FORM_ID,
  CONTACT_FORM_TEMPLATE_VERSION,
  createSeededContactForm,
} from '@/lib/contact-form-template';

/**
 * GET  /api/admin/migrations/seed-contact-form  → does the website Contact Us form exist, and is it current?
 * POST /api/admin/migrations/seed-contact-form  → create it, or update it to the latest template version
 *
 * POST options (query string):
 *   force=true                       rewrite the form even if it is already current
 *   recipients=a@x.ca,b@y.ca         who gets the submission emails (default info@sicklecellanemia.ca),
 *                                    e.g. tech@ while testing before going live
 *
 * Admins only. The form lives at a fixed document id, so this never creates
 * duplicates, and submissions (a subcollection) are never touched.
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

const EMAIL = /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/;

export async function GET() {
  try {
    const authError = await requireAdminSession();
    if (authError) return authError;

    const snap = await getAdminFirestore().collection('surveys').doc(CONTACT_FORM_ID).get();
    const data = snap.exists ? (snap.data() as any) : null;
    const templateVersion = data ? Number(data.templateVersion || 0) : null;
    return NextResponse.json({
      exists: snap.exists,
      surveyId: CONTACT_FORM_ID,
      templateVersion,
      latestTemplateVersion: CONTACT_FORM_TEMPLATE_VERSION,
      isOutdated: snap.exists ? templateVersion !== CONTACT_FORM_TEMPLATE_VERSION : false,
      recipients: data?.emailNotifications?.recipients ?? null,
    });
  } catch (error) {
    return NextResponse.json({ exists: false, error: String(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authError = await requireAdminSession();
    if (authError) return authError;

    const params = new URL(request.url).searchParams;
    const force = params.get('force') === 'true';
    const recipientsParam = params.get('recipients');
    const recipients = recipientsParam
      ? recipientsParam.split(',').map(s => s.trim()).filter(Boolean)
      : CONTACT_FORM_DEFAULT_RECIPIENTS;
    if (recipients.length === 0 || recipients.some(r => !EMAIL.test(r))) {
      return NextResponse.json({ success: false, error: 'recipients must be a comma-separated list of email addresses.' }, { status: 400 });
    }

    const ref = getAdminFirestore().collection('surveys').doc(CONTACT_FORM_ID);
    const snap = await ref.get();
    const existingVersion = snap.exists ? Number((snap.data() as any)?.templateVersion || 0) : 0;
    const isOutdated = snap.exists && existingVersion !== CONTACT_FORM_TEMPLATE_VERSION;

    if (snap.exists && !force && !isOutdated && !recipientsParam) {
      return NextResponse.json({
        success: true,
        created: false,
        message: 'Contact form already exists and is up to date.',
        surveyId: CONTACT_FORM_ID,
        templateVersion: existingVersion,
      });
    }

    // Without force, only the recipients change on a current form, so settings
    // edited later in the form editor are kept.
    if (snap.exists && !force && !isOutdated && recipientsParam) {
      await ref.update({ 'emailNotifications.recipients': recipients });
      return NextResponse.json({ success: true, created: false, updated: true, message: 'Recipients updated.', surveyId: CONTACT_FORM_ID, recipients });
    }

    await ref.set(createSeededContactForm(recipients));

    return NextResponse.json({
      success: true,
      created: !snap.exists,
      updated: snap.exists,
      forced: force,
      message: snap.exists ? 'Contact form updated.' : 'Contact form created.',
      surveyId: CONTACT_FORM_ID,
      templateVersion: CONTACT_FORM_TEMPLATE_VERSION,
      recipients,
    });
  } catch (error) {
    console.error('[seed-contact-form]', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Seed failed' },
      { status: 500 },
    );
  }
}
