import {
  CONTACT_FORM_DEFAULT_RECIPIENTS,
  CONTACT_FORM_ID,
  CONTACT_FORM_TEMPLATE_VERSION,
  createSeededContactForm,
} from '@/lib/contact-form-template';

/**
 * Create the website Contact Us form the first time it is needed, and bring it
 * up to date when the template in code gets a newer version, so neither going
 * live nor a redesign takes a manual setup step.
 *
 * An upgrade keeps the email recipients already configured on the form; the
 * rest of the form (questions, wording, settings) follows the template. Forms
 * already on the current version are never touched, so edits made in the
 * editor after an upgrade stay until the next template version.
 */
export async function ensureContactForm(idOrSlug: string): Promise<void> {
  if (idOrSlug !== CONTACT_FORM_ID) return;
  try {
    const { getAdminFirestore } = await import('@/lib/firebase-admin');
    const ref = getAdminFirestore().collection('surveys').doc(CONTACT_FORM_ID);
    await getAdminFirestore().runTransaction(async tx => {
      const snap = await tx.get(ref);
      if (!snap.exists) {
        tx.set(ref, createSeededContactForm());
        return;
      }
      const data = snap.data() || {};
      if (data.templateKey !== 'website-contact') return;
      if ((Number(data.templateVersion) || 0) >= CONTACT_FORM_TEMPLATE_VERSION) return;
      tx.set(ref, createSeededContactForm(keptRecipients(data)));
    });
  } catch (error) {
    console.error('[ensureContactForm] Could not create or update the contact form:', error);
  }
}

/** The recipients already set on the stored form, or the default ones. */
export function keptRecipients(data: Record<string, any>): string[] {
  const stored = data?.emailNotifications?.recipients;
  const valid = Array.isArray(stored) ? stored.filter((r: unknown) => typeof r === 'string' && r.includes('@')) : [];
  return valid.length > 0 ? valid : CONTACT_FORM_DEFAULT_RECIPIENTS;
}
