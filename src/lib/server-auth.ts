/**
 * @fileOverview Server-side authentication utilities (SERVER-ONLY)
 * 
 * ⚠️ SERVER-ONLY MODULE - Uses Firebase Admin SDK
 * 
 * NOTE: Some functions here are Server Actions (async functions called from client),
 * but utility functions don't use 'use server'. Only async functions that are called
 * directly from client components need the directive.
 */

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
// Dynamic import to prevent client bundling
async function getFirebaseAdmin() {
  return await import('@/lib/firebase-admin');
}
import { getRequiredPermission, type PagePermissionKey } from '@/lib/permissions';

export type AppRole = 'super-admin' | 'admin' | 'participant' | 'mentor';

export interface ServerSession {
  uid: string;
  email: string;
  role: AppRole;
}

/**
 * Verify the Firebase session cookie and resolve the application role.
 * Custom claims are the ONLY source of truth for roles.
 */
export async function getServerSession(): Promise<ServerSession | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get('__session');
  if (!cookie?.value) {
    console.log('[ServerAuth] No session cookie found');
    return null;
  }

  const { getAdminAuth } = await getFirebaseAdmin();
  const auth = getAdminAuth();

  try {
    const decoded = await auth.verifySessionCookie(cookie.value, true);
    const email = (decoded.email || '').toLowerCase();
    if (!email) {
      console.log('[ServerAuth] No email in decoded token');
      return null;
    }

    console.log('[ServerAuth] Session verified for email:', email);

    // Read custom claim role from session cookie
    const claimRole = (decoded as any).role as AppRole | undefined;
    console.log('[ServerAuth] Custom claim role in session:', claimRole);

    // Verify the role in session cookie matches current Firebase Auth custom claims
    // This ensures stale sessions are invalidated when roles are updated
    try {
      const user = await auth.getUser(decoded.uid);
      const currentRole = (user.customClaims?.role || '') as AppRole;

      // If there's a mismatch, prefer the current role from Firebase (source of truth)
      // This allows role updates to take effect immediately without requiring re-login
      if (currentRole && claimRole !== currentRole) {
        console.log(`[ServerAuth] ⚠️ Role mismatch detected! Session has "${claimRole}" but Firebase has "${currentRole}". Using current role from Firebase.`);
      }

      // Use current role from Firebase (preferred) or fall back to session cookie role
      const effectiveRole = currentRole || claimRole;

      // Validate role exists and is valid
      if (!effectiveRole || !['super-admin', 'admin', 'mentor', 'participant'].includes(effectiveRole)) {
        console.log('[ServerAuth] ⚠️ Invalid or missing role claim:', effectiveRole);
        return null;
      }

      console.log('[ServerAuth] ✅ Role verified:', effectiveRole);
      return { uid: decoded.uid, email, role: effectiveRole };
    } catch (userError: any) {
      console.error('[ServerAuth] Error fetching user from Firebase Auth:', userError.message);
      // Fallback to session cookie role if we can't verify
      if (claimRole && ['super-admin', 'admin', 'mentor', 'participant'].includes(claimRole)) {
        return { uid: decoded.uid, email, role: claimRole };
      }
      return null;
    }
  } catch (err: any) {
    // Invalid or expired cookie
    console.error('[ServerAuth] Error verifying session cookie:', err.message);
    return null;
  }
}

/**
 * Enforce super-admin OR admin access.
 * Super admins have full access to everything.
 * Regular admins must have specific page permissions.
 */
export async function enforceAdminOrRedirect(): Promise<ServerSession> {
  const session = await getServerSession();
  if (!session) {
    console.log('[ServerAuth] enforceAdminOrRedirect: No session, redirecting to login');
    redirect('/login');
    throw new Error('Unreachable'); // For TypeScript - redirect() doesn't return
  }

  console.log('[ServerAuth] enforceAdminOrRedirect: Session role is:', session.role, 'email:', session.email);

  // Super admin always has access
  if (session.role === 'super-admin') {
    console.log('[ServerAuth] enforceAdminOrRedirect: ✅ Super admin access granted');
    return session;
  }

  // Regular admin always has access
  if (session.role === 'admin') {
    console.log('[ServerAuth] enforceAdminOrRedirect: ✅ Admin access granted');
    return session;
  }

  console.log('[ServerAuth] enforceAdminOrRedirect: ❌ Not admin, redirecting to unauthorized. Role:', session.role);
  redirect('/unauthorized');
  throw new Error('Unreachable'); // For TypeScript - redirect() doesn't return
}

/**
 * Enforce super-admin only access (for sensitive operations like user management)
 */
export async function enforceSuperAdminOrRedirect(): Promise<ServerSession> {
  const session = await getServerSession();
  if (!session) {
    redirect('/login');
    throw new Error('Unreachable'); // For TypeScript - redirect() doesn't return
  }

  if (session.role !== 'super-admin') {
    console.log('[ServerAuth] enforceSuperAdminOrRedirect: ❌ Not super admin, redirecting. Role:', session.role);
    redirect('/unauthorized');
    throw new Error('Unreachable'); // For TypeScript - redirect() doesn't return
  }

  console.log('[ServerAuth] enforceSuperAdminOrRedirect: ✅ Super admin access granted');
  return session;
}

/**
 * Enforce page-specific permission.
 * Super admins always have access.
 * Regular admins need explicit permission.
 * Participants/mentors are denied.
 */
export async function enforcePagePermission(permissionKey: PagePermissionKey): Promise<ServerSession> {
  const session = await getServerSession();
  if (!session) {
    redirect('/login');
    throw new Error('Unreachable'); // For TypeScript - redirect() doesn't return
  }

  // Super admin always has access
  if (session.role === 'super-admin') {
    console.log(`[ServerAuth] Super admin accessing ${permissionKey}`);
    return session;
  }

  // Check if admin has specific page permission
  if (session.role === 'admin') {
    const { getAdminFirestore } = await getFirebaseAdmin();
    const firestore = getAdminFirestore();
    const permsDoc = await firestore.collection('config').doc('page_permissions').get();
    const routesByEmail = permsDoc.exists ? ((permsDoc.data() as any)?.routesByEmail || {}) : {};
    const allowed: string[] = routesByEmail[session.email] || [];

    if (allowed.includes(permissionKey)) {
      console.log(`[ServerAuth] Admin ${session.email} has ${permissionKey} permission`);
      return session;
    }

    console.log(`[ServerAuth] Admin ${session.email} lacks ${permissionKey} permission`);
    redirect('/unauthorized');
    throw new Error('Unreachable'); // For TypeScript - redirect() doesn't return
  }

  // Participants and mentors don't have access to admin pages
  console.log(`[ServerAuth] User ${session.email} with role ${session.role} denied access to ${permissionKey}`);
  redirect('/unauthorized');
  throw new Error('Unreachable'); // For TypeScript - redirect() doesn't return
}

/**
 * Enforce any of the specified page permissions.
 * Useful for parent layouts that cover multiple sub-sections.
 */
export async function enforceAnyPagePermission(permissionKeys: PagePermissionKey[]): Promise<ServerSession> {
  const session = await getServerSession();
  if (!session) {
    redirect('/login');
    throw new Error('Unreachable');
  }

  if (session.role === 'super-admin') return session;

  if (session.role === 'admin') {
    const { getAdminFirestore } = await getFirebaseAdmin();
    const firestore = getAdminFirestore();
    const permsDoc = await firestore.collection('config').doc('page_permissions').get();
    const routesByEmail = permsDoc.exists ? ((permsDoc.data() as any)?.routesByEmail || {}) : {};
    const allowed: string[] = routesByEmail[session.email] || [];

    if (permissionKeys.some(key => allowed.includes(key))) {
      return session;
    }

    redirect('/unauthorized');
    throw new Error('Unreachable');
  }

  redirect('/unauthorized');
  throw new Error('Unreachable');
}

/**
 * Enforce participant or mentor access.
 * Super admins can also access (for viewing profiles).
 */
export async function enforceParticipantOrMentorOrRedirect(): Promise<ServerSession> {
  const session = await getServerSession();
  if (!session) {
    redirect('/login');
    throw new Error('Unreachable'); // For TypeScript - redirect() doesn't return
  }

  // Allow participants, mentors, and super admin
  if (session.role === 'participant' || session.role === 'mentor' || session.role === 'super-admin') {
    return session;
  }

  redirect('/unauthorized');
  throw new Error('Unreachable'); // For TypeScript - redirect() doesn't return
}

/**
 * Enforce admin or super-admin in server actions
 */
export async function enforceAdminInAction(): Promise<void> {
  const session = await getServerSession();
  if (!session) {
    throw new Error('Unauthorized: authentication required');
  }

  if (session.role !== 'admin' && session.role !== 'super-admin') {
    throw new Error('Unauthorized: admin access required');
  }
}

/**
 * Enforce super-admin only in server actions (for sensitive operations)
 */
export async function enforceSuperAdminInAction(): Promise<void> {
  const session = await getServerSession();
  if (!session || session.role !== 'super-admin') {
    throw new Error('Unauthorized: super admin access required');
  }
}

/**
 * Check if user has specific page permission (returns boolean instead of redirecting)
 */
export async function hasPagePermission(email: string, permissionKey: PagePermissionKey): Promise<boolean> {
  const { getAdminFirestore } = await getFirebaseAdmin();
  const firestore = getAdminFirestore();
  try {
    const permsDoc = await firestore.collection('config').doc('page_permissions').get();
    const routesByEmail = permsDoc.exists ? ((permsDoc.data() as any)?.routesByEmail || {}) : {};
    const allowed: string[] = routesByEmail[email.toLowerCase()] || [];
    return allowed.includes(permissionKey);
  } catch (err) {
    console.error('[ServerAuth] Error checking page permission:', err);
    return false;
  }
}

/**
 * Get all accessible pages for a user based on their role and permissions.
 * Returns an array of PagePermission objects they can access.
 */
export async function getAccessiblePages(email: string, role: AppRole): Promise<import('@/lib/permissions').PagePermission[]> {
  const { PAGE_PERMISSIONS } = await import('@/lib/permissions');

  // Participants and mentors can only access their profile
  if (role === 'participant' || role === 'mentor') {
    return [];
  }

  // Super admins have access to all pages
  if (role === 'super-admin') {
    return PAGE_PERMISSIONS;
  }

  // Regular admins: check their specific permissions
  if (role === 'admin') {
    const { getAdminFirestore } = await getFirebaseAdmin();
    const firestore = getAdminFirestore();
    try {
      const permsDoc = await firestore.collection('config').doc('page_permissions').get();
      const routesByEmail = permsDoc.exists ? ((permsDoc.data() as any)?.routesByEmail || {}) : {};
      const allowedPermissions: string[] = routesByEmail[email.toLowerCase()] || [];

      // Filter PAGE_PERMISSIONS to only those the admin has
      return PAGE_PERMISSIONS.filter(p => allowedPermissions.includes(p.key));
    } catch (err) {
      console.error('[ServerAuth] Error getting accessible pages:', err);
      return [];
    }
  }

  return [];
}


