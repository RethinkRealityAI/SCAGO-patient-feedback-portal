import { CONTACT_FORM_ID, createSeededContactForm } from '@/lib/contact-form-template';

/**
 * Create the website Contact Us form the first time it is needed, so going
 * live takes no manual setup step. Only creates: an existing form (and any
 * changes made to it in the editor) is never overwritten; use the
 * seed-contact-form admin route to update it to a newer template.
 */
export async function ensureContactForm(idOrSlug: string): Promise<void> {
  if (idOrSlug !== CONTACT_FORM_ID) return;
  try {
    const { getAdminFirestore } = await import('@/lib/firebase-admin');
    const ref = getAdminFirestore().collection('surveys').doc(CONTACT_FORM_ID);
    await getAdminFirestore().runTransaction(async tx => {
      const snap = await tx.get(ref);
      if (!snap.exists) tx.set(ref, createSeededContactForm());
    });
  } catch (error) {
    console.error('[ensureContactForm] Could not create the contact form:', error);
  }
}
