/**
 * Route a form's staff notification to regional contacts, based on the
 * respondent's city and the city -> region mapping managed in the admin
 * control center (Settings > Regions).
 *
 * Stored on the survey as `emailNotifications.regionRouting`. Pure functions
 * so the rules can be tested and previewed in the editor exactly as the
 * server applies them.
 */
import { normalizeCityValue } from '@/lib/city-to-region';

export interface RegionRoutingConfig {
  enabled?: boolean;
  /** The form's city question (a `city-on` field) whose answer decides the region. */
  sourceFieldId?: string;
  /** Region name -> email addresses for that region. */
  routes?: Record<string, string[]>;
  /**
   * Named groups of cities with their own contacts, e.g. Windsor-Essex inside
   * the West region. For those cities they replace the region's contacts.
   */
  areaRoutes?: AreaRoute[];
  /**
   * Also send every submission to the main recipients. Default true. When
   * false, the main recipients only get submissions no region contact covers.
   */
  alwaysNotifyMain?: boolean;
}

export interface AreaRoute {
  /** Shown to staff and in the email subject, e.g. "Windsor-Essex". */
  name: string;
  /** City slugs, as stored by the City (Ontario) question. */
  cities: string[];
  emails: string[];
}

export const UNKNOWN_REGION = 'Unknown';

/** A city answer as a slug ("north-bay"), or '' when there is none. Free-text "Other" answers keep their text. */
function citySlug(cityAnswer: unknown): string {
  const city = normalizeCityValue(cityAnswer);
  return city ? city.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') : '';
}

/** The region for a city answer, or Unknown when it isn't mapped (including free-text "Other"). */
export function regionForCity(cityAnswer: unknown, cityToRegion: Record<string, string>): string {
  const city = normalizeCityValue(cityAnswer);
  if (!city) return UNKNOWN_REGION;
  // Mapping keys are slugs ("north-bay"); answers may be a slug or a label.
  return cityToRegion[city] || cityToRegion[citySlug(cityAnswer)] || UNKNOWN_REGION;
}

/** The specific area (with contacts) a city answer falls in, if any. */
export function areaForCity(cityAnswer: unknown, areas: AreaRoute[] | undefined): AreaRoute | undefined {
  const slug = citySlug(cityAnswer);
  if (!slug) return undefined;
  return (areas || []).find(a => a.cities.includes(slug) && a.emails.some(e => e && e.trim()));
}

function dedupeEmails(lists: string[][]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const email of lists.flat()) {
    const trimmed = typeof email === 'string' ? email.trim() : '';
    const key = trimmed.toLowerCase();
    if (!trimmed || seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}

export interface RoutingDecision {
  recipients: string[];
  /** Set when regional routing is on (Unknown when the city didn't map). */
  region?: string;
  /** The specific area whose contacts were used, if the city is in one. */
  area?: string;
  /** True when the region (or area) had its own contacts. */
  routedToRegion: boolean;
}

/**
 * Who receives a submission's notification.
 * - Routing off: the main recipients.
 * - City is in a specific area with contacts: that area's contacts (instead of
 *   the region's), plus the main recipients unless `alwaysNotifyMain` is false.
 * - Otherwise, region has contacts: the same, with the region's contacts.
 * - No contacts for the area or region (or no city): the main recipients, so
 *   nothing is ever dropped.
 */
export function resolveNotificationRecipients(input: {
  mainRecipients?: string[];
  routing?: RegionRoutingConfig;
  submission: Record<string, unknown>;
  cityToRegion: Record<string, string>;
}): RoutingDecision {
  const main = dedupeEmails([input.mainRecipients || []]);
  const routing = input.routing;
  if (!routing?.enabled || !routing.sourceFieldId) {
    return { recipients: main, routedToRegion: false };
  }
  const cityAnswer = input.submission[routing.sourceFieldId];
  const region = regionForCity(cityAnswer, input.cityToRegion);
  const area = areaForCity(cityAnswer, routing.areaRoutes);
  const regional = dedupeEmails([area ? area.emails : routing.routes?.[region] || []]);
  if (regional.length === 0) {
    return { recipients: main, region, routedToRegion: false };
  }
  const recipients = routing.alwaysNotifyMain === false ? regional : dedupeEmails([main, regional]);
  return { recipients, region, ...(area ? { area: area.name } : {}), routedToRegion: true };
}

/** Whether `email` is a regional or area contact in this routing. */
export function isRoutingContact(email: string, routing: RegionRoutingConfig | undefined): boolean {
  if (!routing?.enabled) return false;
  const me = email.trim().toLowerCase();
  if (!me) return false;
  const lists = [...Object.values(routing.routes || {}), ...(routing.areaRoutes || []).map(a => a.emails)];
  return lists.some(list => list.some(e => e.trim().toLowerCase() === me));
}

/**
 * What a viewer may see of a form with regional routing: a regional contact
 * sees only the submissions routed to them (their region or area); everyone
 * else (super-admins, main recipients, other staff) sees all of them.
 */
export function visibleToViewer(
  submission: Record<string, unknown>,
  routing: RegionRoutingConfig | undefined,
  cityToRegion: Record<string, string>,
  viewer: { email: string; isSuperAdmin: boolean }
): boolean {
  if (viewer.isSuperAdmin || !routing?.enabled || !routing.sourceFieldId) return true;
  if (!isRoutingContact(viewer.email, routing)) return true;
  const me = viewer.email.trim().toLowerCase();
  const { recipients } = resolveNotificationRecipients({ mainRecipients: [], routing, submission, cityToRegion });
  return recipients.some(r => r.toLowerCase() === me);
}

/** The city -> region map in effect: a saved, non-empty map replaces the built-in defaults. */
export function effectiveCityToRegion(
  saved: Record<string, string> | null | undefined,
  defaults: Record<string, string>
): Record<string, string> {
  return saved && Object.keys(saved).length > 0 ? saved : { ...defaults };
}

/** Cities mapped to each region, for showing what a region covers. */
export function citiesByRegion(cityToRegion: Record<string, string>): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const [city, region] of Object.entries(cityToRegion)) {
    (out[region] ||= []).push(city);
  }
  for (const list of Object.values(out)) list.sort();
  return out;
}
