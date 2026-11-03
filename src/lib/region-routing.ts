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
   * Also send every submission to the main recipients. Default true. When
   * false, the main recipients only get submissions no region contact covers.
   */
  alwaysNotifyMain?: boolean;
}

export const UNKNOWN_REGION = 'Unknown';

/** The region for a city answer, or Unknown when it isn't mapped (including free-text "Other"). */
export function regionForCity(cityAnswer: unknown, cityToRegion: Record<string, string>): string {
  const city = normalizeCityValue(cityAnswer);
  if (!city) return UNKNOWN_REGION;
  // Mapping keys are slugs ("north-bay"); answers may be a slug or a label.
  const slug = city.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return cityToRegion[city] || cityToRegion[slug] || UNKNOWN_REGION;
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
  /** True when the region had its own contacts. */
  routedToRegion: boolean;
}

/**
 * Who receives a submission's notification.
 * - Routing off: the main recipients.
 * - Region has contacts: those contacts, plus the main recipients unless
 *   `alwaysNotifyMain` is false.
 * - No contacts for the region (or no city): the main recipients, so nothing
 *   is ever dropped.
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
  const region = regionForCity(input.submission[routing.sourceFieldId], input.cityToRegion);
  const regional = dedupeEmails([routing.routes?.[region] || []]);
  if (regional.length === 0) {
    return { recipients: main, region, routedToRegion: false };
  }
  const recipients = routing.alwaysNotifyMain === false ? regional : dedupeEmails([main, regional]);
  return { recipients, region, routedToRegion: true };
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
