/**
 * Which forms the signed-in viewer is a regional (or area) contact on.
 *
 * Firestore rules stop regional contacts reading those forms' submissions
 * directly (docs/firestore.rules, isRegionalContact), so dashboards load them
 * through the getViewerScopedSubmissions server action instead, which returns
 * only the viewer's own region. Everyone else reads as before.
 */
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { isRoutingContact, type RegionRoutingConfig } from '@/lib/region-routing';

export async function regionallyScopedForms(
  surveyIds: string[],
  viewer: { email: string | null | undefined; isSuperAdmin: boolean }
): Promise<Set<string>> {
  const email = (viewer.email || '').toLowerCase();
  const scoped = new Set<string>();
  if (viewer.isSuperAdmin || !email) return scoped;
  await Promise.all(
    [...new Set(surveyIds.filter(Boolean))].map(async id => {
      try {
        const routing = (await getDoc(doc(db, 'surveys', id))).data()?.emailNotifications?.regionRouting as
          | RegionRoutingConfig
          | undefined;
        if (isRoutingContact(email, routing)) scoped.add(id);
      } catch {
        // Unreadable form: treat as not scoped; the rules still decide what loads.
      }
    })
  );
  return scoped;
}
