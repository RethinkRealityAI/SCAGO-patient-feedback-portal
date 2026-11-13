/**
 * Dashboard-side filter so a regional contact sees only their region's (or
 * area's) submissions on forms with regional routing. Rules live in
 * visibleToViewer (src/lib/region-routing.ts); this loads what they need.
 */
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { DEFAULT_CITY_TO_REGION } from '@/lib/city-to-region';
import { effectiveCityToRegion, isRoutingContact, visibleToViewer, type RegionRoutingConfig } from '@/lib/region-routing';

export type ViewerFilter = (submission: { surveyId?: string } & Record<string, any>) => boolean;

const showAll: ViewerFilter = () => true;

export async function loadViewerFilter(
  surveyIds: string[],
  viewer: { email: string | null | undefined; isSuperAdmin: boolean }
): Promise<ViewerFilter> {
  const email = (viewer.email || '').toLowerCase();
  if (viewer.isSuperAdmin || !email) return showAll;

  const ids = [...new Set(surveyIds.filter(Boolean))];
  const routings = new Map<string, RegionRoutingConfig>();
  await Promise.all(
    ids.map(async id => {
      try {
        const snap = await getDoc(doc(db, 'surveys', id));
        const routing = snap.data()?.emailNotifications?.regionRouting as RegionRoutingConfig | undefined;
        if (isRoutingContact(email, routing)) routings.set(id, routing!);
      } catch {
        // Unreadable survey: leave its submissions as they are.
      }
    })
  );
  if (routings.size === 0) return showAll;

  let saved: Record<string, string> | null = null;
  try {
    saved = ((await getDoc(doc(db, 'config', 'region_mappings'))).data()?.mappings as Record<string, string>) || null;
  } catch {
    // Fall back to the built-in map.
  }
  const cityToRegion = effectiveCityToRegion(saved, DEFAULT_CITY_TO_REGION);

  return submission => {
    const routing = submission.surveyId ? routings.get(submission.surveyId) : undefined;
    return routing ? visibleToViewer(submission, routing, cityToRegion, { email, isSuperAdmin: false }) : true;
  };
}
