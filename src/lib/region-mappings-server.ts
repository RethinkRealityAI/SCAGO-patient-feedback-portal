/**
 * Read the city -> region mapping managed in the admin control center
 * (Settings > Regions), for server code that runs without an admin session,
 * such as a public form submission choosing who to notify.
 *
 * Mirrors getRegionMappings() in src/app/admin/user-actions.ts: a saved,
 * non-empty mapping replaces the built-in defaults; entries pointing at a
 * region that no longer exists are ignored.
 */
import { DEFAULT_CITY_TO_REGION } from '@/lib/city-to-region';
import { DEFAULT_REGIONS } from '@/types/patient';
import { isRoutingContact, visibleToViewer, type RegionRoutingConfig } from '@/lib/region-routing';

const slug = (value: string) =>
  value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

export async function loadCityToRegionMap(): Promise<Record<string, string>> {
  try {
    const { getAdminFirestore } = await import('@/lib/firebase-admin');
    const firestore = getAdminFirestore();
    const [regionsSnap, mappingsSnap] = await Promise.all([
      firestore.collection('config').doc('regions').get(),
      firestore.collection('config').doc('region_mappings').get(),
    ]);
    const configured = regionsSnap.exists ? (regionsSnap.data()?.regions as string[] | undefined) : undefined;
    const validRegions = new Set(Array.isArray(configured) && configured.length > 0 ? configured : [...DEFAULT_REGIONS]);

    const saved = (mappingsSnap.exists ? mappingsSnap.data()?.mappings : null) as Record<string, string> | null;
    const mappings: Record<string, string> = {};
    for (const [rawCity, rawRegion] of Object.entries(saved || {})) {
      const city = slug(rawCity || '');
      const region = (rawRegion || '').trim();
      if (!city || city === 'other' || region === 'Unknown' || !validRegions.has(region)) continue;
      mappings[city] = region;
    }
    return Object.keys(mappings).length > 0 ? mappings : { ...DEFAULT_CITY_TO_REGION };
  } catch (error) {
    console.error('[region-mappings] Could not load region mappings; using defaults.', error);
    return { ...DEFAULT_CITY_TO_REGION };
  }
}

/**
 * Server-side counterpart of loadViewerFilter (src/lib/region-visibility-client.ts),
 * for server code that reads submissions on a viewer's behalf (e.g. AI summaries):
 * a regional contact sees only their region's submissions on routed forms.
 */
export async function loadViewerFilterServer(
  surveyIds: string[],
  viewer: { email: string; isSuperAdmin: boolean }
): Promise<(submission: { surveyId?: string } & Record<string, any>) => boolean> {
  const email = (viewer.email || '').toLowerCase();
  if (viewer.isSuperAdmin || !email) return () => true;
  const { getAdminFirestore } = await import('@/lib/firebase-admin');
  const firestore = getAdminFirestore();
  const routings = new Map<string, RegionRoutingConfig>();
  await Promise.all(
    [...new Set(surveyIds.filter(Boolean))].map(async id => {
      const routing = (await firestore.collection('surveys').doc(id).get()).data()?.emailNotifications?.regionRouting;
      if (isRoutingContact(email, routing)) routings.set(id, routing);
    })
  );
  if (routings.size === 0) return () => true;
  const cityToRegion = await loadCityToRegionMap();
  return submission => {
    const routing = submission.surveyId ? routings.get(submission.surveyId) : undefined;
    return routing ? visibleToViewer(submission, routing, cityToRegion, { email, isSuperAdmin: false }) : true;
  };
}
