'use server';

// Dynamic imports for server-only modules
import { enforceAdminInAction } from '@/lib/server-auth';
import { DEFAULT_REGIONS, type Patient } from '@/types/patient';
import { DEFAULT_CITY_TO_REGION } from '@/lib/city-to-region';
import { ontarioCities } from '@/lib/location-data';

export type AppRole = 'super-admin' | 'admin' | 'mentor' | 'participant';
export type RegionAccessPolicyMode = 'legacy' | 'strict';
export type RegionMappingDictionary = Record<string, string>;
export type RegionCityOption = { label: string; value: string };

const REGIONS_CONFIG_DOC = 'regions';

/**
 * Get the list of regions from Firestore config. Returns default regions if not configured.
 * Unknown is always included and cannot be removed.
 * Requires an authenticated admin session (uses Admin SDK via server action).
 */
export async function getRegions(): Promise<string[]> {
  // Auth guard — callers must be an authenticated admin (or super-admin).
  // We use a soft check: if no valid session exists we still return defaults
  // so that the server-side consent-to-patient flow (already behind its own
  // auth) doesn't break. But we verify session when one is available.
  try {
    await enforceAdminInAction();
  } catch (authError) {
    // Fallback: if called from an already-authenticated server action context
    // where enforceAdminInAction cannot resolve the cookie (e.g. nested call),
    // return defaults safely rather than throwing. We log explicitly so this
    // path is observable during debugging/audits.
    console.warn('getRegions auth check failed; using default regions fallback.', authError);
    return [...DEFAULT_REGIONS];
  }
  const { getAdminFirestore } = await import('@/lib/firebase-admin');
  const firestore = getAdminFirestore();
  try {
    const snap = await firestore.collection('config').doc(REGIONS_CONFIG_DOC).get();
    if (!snap.exists) return [...DEFAULT_REGIONS];
    const data = snap.data() as { regions?: string[] };
    const regions = Array.isArray(data?.regions) ? data.regions : [...DEFAULT_REGIONS];
    const unknownIncluded = regions.includes('Unknown');
    const filtered = regions.filter((r) => typeof r === 'string' && r.trim().length > 0);
    const unique = [...new Set(filtered)];
    if (!unknownIncluded) unique.push('Unknown');
    return unique;
  } catch {
    return [...DEFAULT_REGIONS];
  }
}

/**
 * Set the list of regions. Unknown is always appended if not present.
 */
export async function setRegions(regions: string[]): Promise<{ success: true } | { success: false; error: string }> {
  await enforceAdminInAction();
  const { getAdminFirestore } = await import('@/lib/firebase-admin');
  const firestore = getAdminFirestore();
  const session = await (await import('@/lib/server-auth')).getServerSession();
  try {
    const valid = regions
      .filter((r) => typeof r === 'string' && r.trim().length > 0 && r !== 'Unknown')
      .map((r) => r.trim());
    const unique = [...new Set(valid)];
    unique.push('Unknown');
    await firestore.collection('config').doc(REGIONS_CONFIG_DOC).set({
      regions: unique,
      updatedAt: new Date().toISOString(),
      updatedBy: session?.email || 'unknown',
    });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to save regions' };
  }
}

function sanitizeRegionMappings(mappings: Record<string, string>, validRegions: Set<string>): RegionMappingDictionary {
  const sanitized: RegionMappingDictionary = {};
  Object.entries(mappings || {}).forEach(([rawCity, rawRegion]) => {
    const city = normalizeCitySlug(rawCity);
    const region = (rawRegion || '').trim();
    if (!city || city === 'other') return;
    if (region === 'Unknown') return;
    if (!validRegions.has(region)) return;
    sanitized[city] = region;
  });
  return sanitized;
}

export interface PlatformUser {
  uid: string;
  email: string;
  displayName?: string | null;
  disabled: boolean;
  emailVerified: boolean;
  role: AppRole;
  createdAt?: string;
  lastLoginAt?: string;
  allowedForms?: string[];
  defaultView?: string;
}

function normalizeCitySlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function sanitizeCityOptions(cities: Array<{ label: string; value: string }>): RegionCityOption[] {
  const bySlug = new Map<string, RegionCityOption>();
  for (const city of cities || []) {
    const label = (city.label || '').trim();
    const value = normalizeCitySlug(city.value || city.label || '');
    if (!label || !value || value === 'other') continue;
    bySlug.set(value, { label, value });
  }
  return Array.from(bySlug.values()).sort((a, b) => a.label.localeCompare(b.label));
}

export async function listPlatformUsers(): Promise<{ users: PlatformUser[] }> {
  await enforceAdminInAction();
  const { getAdminAuth, getAdminFirestore } = await import('@/lib/firebase-admin');
  const auth = getAdminAuth();
  const firestore = getAdminFirestore();

  const result = await auth.listUsers(1000);
  const permissionsDoc = await firestore.collection('config').doc('page_permissions').get();
  const defaultViewByEmail = permissionsDoc.exists
    ? (((permissionsDoc.data() as any)?.defaultViewByEmail || {}) as Record<string, string>)
    : {};

  const users: PlatformUser[] = result.users.map((u) => {
    const claims = (u.customClaims || {}) as Record<string, any>;
    // Default to 'participant' if no role is set (should rarely happen)
    const role: AppRole = (claims.role as AppRole) || 'participant';
    const email = u.email || '';
    return {
      uid: u.uid,
      email,
      displayName: u.displayName,
      disabled: u.disabled,
      emailVerified: !!u.emailVerified,
      role,
      createdAt: u.metadata?.creationTime || undefined,
      lastLoginAt: u.metadata?.lastSignInTime || undefined,
      defaultView: defaultViewByEmail[email.toLowerCase()] || undefined,
    };
  });

  return { users };
}

export async function createPlatformUser(input: {
  email: string;
  password: string;
  displayName?: string;
  role?: AppRole;
  pagePermissions?: string[]; // route keys
  allowedForms?: string[]; // form slugs/ids
  allowedRegions?: string[]; // SCAGO region keys for patient access
  defaultView?: string; // route path for post-login landing
}): Promise<{ success: true; uid: string } | { success: false; error: string }> {
  await enforceAdminInAction();
  const { getAdminAuth, getAdminFirestore } = await import('@/lib/firebase-admin');
  const auth = getAdminAuth();
  const firestore = getAdminFirestore();

  const email = (input.email || '').trim().toLowerCase();
  if (!email || !email.includes('@')) return { success: false, error: 'Invalid email address' };
  if (!input.password || input.password.length < 6) return { success: false, error: 'Password must be at least 6 characters' };

  try {
    // Check if user already exists
    try {
      await auth.getUserByEmail(email);
      return { success: false, error: `A user with email ${email} already exists` };
    } catch (err: any) {
      // User doesn't exist, which is what we want - continue
      if (err.code !== 'auth/user-not-found') {
        // Some other error occurred
        throw err;
      }
    }

    const user = await auth.createUser({
      email,
      password: input.password,
      displayName: input.displayName,
      emailVerified: false,
      disabled: false,
    });

    // Set role (required - default to participant if not provided)
    const role: AppRole = input.role || 'participant';
    const existing = (await auth.getUser(user.uid)).customClaims || {};
    await auth.setCustomUserClaims(user.uid, { ...existing, role });

    // Set page-level config values when provided
    const normalizedDefaultView = (input.defaultView || '').startsWith('/') ? input.defaultView : undefined;
    if (
      (input.pagePermissions && input.pagePermissions.length > 0) ||
      (input.allowedForms && input.allowedForms.length > 0) ||
      (input.allowedRegions && input.allowedRegions.length > 0) ||
      normalizedDefaultView !== undefined
    ) {
      const permsRef = firestore.collection('config').doc('page_permissions');
      const snap = await permsRef.get();
      const currentRoutes = snap.exists ? ((snap.data() as any)?.routesByEmail || {}) : {};
      const currentForms = snap.exists ? ((snap.data() as any)?.formsByEmail || {}) : {};
      const currentRegions = snap.exists ? ((snap.data() as any)?.regionsByEmail || {}) : {};
      const currentDefaultViews = snap.exists ? ((snap.data() as any)?.defaultViewByEmail || {}) : {};

      const updatedRoutes = { ...currentRoutes, [email]: input.pagePermissions || [] };
      const updatedForms = { ...currentForms, [email]: input.allowedForms || [] };
      const updatedRegions = { ...currentRegions, [email]: input.allowedRegions || [] };
      const updatedDefaultViews = normalizedDefaultView !== undefined
        ? { ...currentDefaultViews, [email]: normalizedDefaultView }
        : currentDefaultViews;

      await permsRef.set({
        routesByEmail: updatedRoutes,
        formsByEmail: updatedForms,
        regionsByEmail: updatedRegions,
        defaultViewByEmail: updatedDefaultViews
      }, { merge: true });
    }

    // Log user creation
    await logUserActivity(user.uid, email, 'user_created', { role, email });

    return { success: true, uid: user.uid };
  } catch (err: any) {
    const message = err?.message || 'Failed to create user';
    return { success: false, error: message };
  }
}

export async function setUserRole(uid: string, role: AppRole): Promise<{ success: true } | { success: false; error: string }> {
  await enforceAdminInAction();
  const { getAdminAuth } = await import('@/lib/firebase-admin');
  const auth = getAdminAuth();
  try {
    const user = await auth.getUser(uid);
    const oldRole = (user.customClaims as any)?.role || 'none';
    const existing = user.customClaims || {};
    await auth.setCustomUserClaims(uid, { ...existing, role });

    // Log role change
    await logUserActivity(uid, user.email || '', 'role_changed', {
      oldRole,
      newRole: role
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to set role' };
  }
}

export async function setUserDisabled(uid: string, disabled: boolean): Promise<{ success: true } | { success: false; error: string }> {
  await enforceAdminInAction();
  const { getAdminAuth } = await import('@/lib/firebase-admin');
  const auth = getAdminAuth();
  try {
    await auth.updateUser(uid, { disabled });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to update status' };
  }
}

export async function updateUserPassword(uid: string, newPassword: string): Promise<{ success: true } | { success: false; error: string }> {
  await enforceAdminInAction();
  const { getAdminAuth } = await import('@/lib/firebase-admin');
  const auth = getAdminAuth();
  if (!newPassword || newPassword.length < 6) return { success: false, error: 'Password must be at least 6 characters' };
  try {
    await auth.updateUser(uid, { password: newPassword });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to update password' };
  }
}

export async function deleteUserById(uid: string): Promise<{ success: true } | { success: false; error: string }> {
  await enforceAdminInAction();
  const { getAdminAuth } = await import('@/lib/firebase-admin');
  const auth = getAdminAuth();
  try {
    await auth.deleteUser(uid);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to delete user' };
  }
}

export async function setUserPagePermissions(
  email: string,
  routes: string[],
  allowedForms?: string[],
  allowedRegions?: string[],
  defaultView?: string
): Promise<{ success: true } | { success: false; error: string }> {
  await enforceAdminInAction();
  const { getAdminAuth, getAdminFirestore } = await import('@/lib/firebase-admin');
  const firestore = getAdminFirestore();
  const auth = getAdminAuth();

  try {
    const normalizedEmail = email.toLowerCase();
    const permsRef = firestore.collection('config').doc('page_permissions');
    const snap = await permsRef.get();

    const currentRoutes = snap.exists ? ((snap.data() as any)?.routesByEmail || {}) : {};
    const currentForms = snap.exists ? ((snap.data() as any)?.formsByEmail || {}) : {};
    const currentRegions = snap.exists ? ((snap.data() as any)?.regionsByEmail || {}) : {};
    const currentDefaultViews = snap.exists ? ((snap.data() as any)?.defaultViewByEmail || {}) : {};

    const previousRoutes: string[] = currentRoutes[normalizedEmail] || [];
    const previousForms: string[] = currentForms[normalizedEmail] || [];
    const previousRegions: string[] = currentRegions[normalizedEmail] || [];
    const previousDefaultView: string = currentDefaultViews[normalizedEmail] || '';
    const nextForms = allowedForms !== undefined ? allowedForms : previousForms;
    const nextRegions = allowedRegions !== undefined ? allowedRegions : previousRegions;
    const normalizedDefaultView = defaultView !== undefined && defaultView.startsWith('/') ? defaultView : previousDefaultView;

    const updatedRoutes = { ...currentRoutes, [normalizedEmail]: routes };
    const updatedForms = allowedForms !== undefined
      ? { ...currentForms, [normalizedEmail]: allowedForms }
      : currentForms;
    const updatedRegions = allowedRegions !== undefined
      ? { ...currentRegions, [normalizedEmail]: allowedRegions }
      : currentRegions;
    const updatedDefaultViews = defaultView !== undefined
      ? { ...currentDefaultViews, [normalizedEmail]: normalizedDefaultView }
      : currentDefaultViews;

    await permsRef.set({
      routesByEmail: updatedRoutes,
      formsByEmail: updatedForms,
      regionsByEmail: updatedRegions,
      defaultViewByEmail: updatedDefaultViews
    }, { merge: true });

    // Log permission change
    try {
      const user = await auth.getUserByEmail(email);
      const arrayDiff = (before: string[], after: string[]) => ({
        added: after.filter((item) => !before.includes(item)),
        removed: before.filter((item) => !after.includes(item)),
      });
      await logUserActivity(user.uid, email, 'permissions_changed', {
        before: {
          permissions: previousRoutes,
          allowedForms: previousForms,
          allowedRegions: previousRegions,
          defaultView: previousDefaultView,
        },
        after: {
          permissions: routes,
          allowedForms: nextForms,
          allowedRegions: nextRegions,
          defaultView: normalizedDefaultView,
        },
        delta: {
          permissions: arrayDiff(previousRoutes, routes),
          allowedForms: arrayDiff(previousForms, nextForms),
          allowedRegions: arrayDiff(previousRegions, nextRegions),
          defaultViewChanged: previousDefaultView !== normalizedDefaultView,
        },
      });
    } catch (err) {
      console.error('Failed to log permission change:', err);
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to set permissions' };
  }
}

export async function getRegionAccessPolicy(): Promise<{ success: true; mode: RegionAccessPolicyMode } | { success: false; error: string }> {
  await enforceAdminInAction();
  const { getAdminFirestore } = await import('@/lib/firebase-admin');
  const firestore = getAdminFirestore();
  try {
    const snap = await firestore.collection('config').doc('page_permissions').get();
    if (!snap.exists) return { success: true, mode: 'legacy' };
    const data = snap.data() as any;
    const mode = data?.regionAccessPolicy?.mode;
    return { success: true, mode: mode === 'strict' ? 'strict' : 'legacy' };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to get region access policy' };
  }
}

export async function setRegionAccessPolicy(mode: RegionAccessPolicyMode): Promise<{ success: true } | { success: false; error: string }> {
  await enforceAdminInAction();
  const { getAdminFirestore } = await import('@/lib/firebase-admin');
  const firestore = getAdminFirestore();
  const session = await (await import('@/lib/server-auth')).getServerSession();
  try {
    await firestore.collection('config').doc('page_permissions').set({
      regionAccessPolicy: {
        mode,
        updatedAt: new Date().toISOString(),
        updatedBy: session?.email || 'unknown',
      }
    }, { merge: true });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to set region access policy' };
  }
}

export async function getRegionMappings(): Promise<
  { success: true; mappings: RegionMappingDictionary; cities: RegionCityOption[]; regions: string[] } |
  { success: false; error: string }
> {
  await enforceAdminInAction();
  const { getAdminFirestore } = await import('@/lib/firebase-admin');
  const firestore = getAdminFirestore();
  try {
    const regions = await getRegions();
    const validRegions = new Set(regions);
    const snap = await firestore.collection('config').doc('region_mappings').get();
    const defaultCities = sanitizeCityOptions(ontarioCities as Array<{ label: string; value: string }>);
    if (!snap.exists) {
      return {
        success: true,
        mappings: { ...DEFAULT_CITY_TO_REGION },
        cities: defaultCities,
        regions,
      };
    }
    const data = snap.data() as any;
    const mappings = sanitizeRegionMappings((data?.mappings || {}) as Record<string, string>, validRegions);
    const cities = sanitizeCityOptions((data?.cities || defaultCities) as Array<{ label: string; value: string }>);
    return {
      success: true,
      mappings: Object.keys(mappings).length > 0 ? mappings : { ...DEFAULT_CITY_TO_REGION },
      cities,
      regions,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to get region mappings' };
  }
}

export async function setRegionMappings(input: {
  mappings: Record<string, string>;
  cities?: Array<{ label: string; value: string }>;
}): Promise<{ success: true } | { success: false; error: string }> {
  await enforceAdminInAction();
  const { getAdminFirestore } = await import('@/lib/firebase-admin');
  const firestore = getAdminFirestore();
  const session = await (await import('@/lib/server-auth')).getServerSession();
  try {
    const regions = await getRegions();
    const validRegions = new Set(regions);
    const mappings = sanitizeRegionMappings(input?.mappings || {}, validRegions);
    const defaultCities = sanitizeCityOptions(ontarioCities as Array<{ label: string; value: string }>);
    const suppliedCities = input?.cities && input.cities.length > 0 ? input.cities : defaultCities;
    const cities = sanitizeCityOptions(suppliedCities);
    await firestore.collection('config').doc('region_mappings').set({
      mappings,
      cities,
      updatedAt: new Date().toISOString(),
      updatedBy: session?.email || 'unknown',
    }, { merge: true });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to set region mappings' };
  }
}

/**
 * Get page and form permissions for a user by email
 */
export async function getUserPagePermissions(email: string): Promise<{ permissions?: string[]; allowedForms?: string[]; allowedRegions?: string[]; defaultView?: string; error?: string }> {
  await enforceAdminInAction();
  const { getAdminFirestore } = await import('@/lib/firebase-admin');
  const firestore = getAdminFirestore();

  try {
    const permsRef = firestore.collection('config').doc('page_permissions');
    const snap = await permsRef.get();

    if (!snap.exists) {
      return { permissions: [] };
    }

    const data = snap.data() as any;
    const routesByEmail = data?.routesByEmail || {};
    const formsByEmail = data?.formsByEmail || {};
    const regionsByEmail = data?.regionsByEmail || {};
    const defaultViewByEmail = data?.defaultViewByEmail || {};

    const permissions = routesByEmail[email.toLowerCase()] || [];
    const allowedForms = formsByEmail[email.toLowerCase()] || [];
    const allowedRegions = regionsByEmail[email.toLowerCase()] || [];
    const defaultView = defaultViewByEmail[email.toLowerCase()] || undefined;

    return { permissions, allowedForms, allowedRegions, defaultView };
  } catch (err: any) {
    return { error: err?.message || 'Failed to get permissions' };
  }
}

/**
 * Log user activity to Firestore
 */
async function logUserActivity(
  userId: string,
  userEmail: string,
  action: string,
  details: Record<string, any>
): Promise<void> {
  try {
    const { getAdminFirestore } = await import('@/lib/firebase-admin');
    const firestore = getAdminFirestore();
    await firestore.collection('user_activity').add({
      userId,
      userEmail,
      action,
      details,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Failed to log user activity:', err);
    // Don't throw - logging failure shouldn't break user operations
  }
}


