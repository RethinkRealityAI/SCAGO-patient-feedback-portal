import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getAdminAuth, getAdminFirestore } from '@/lib/firebase-admin';
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

  const auth = getAdminAuth();

  try {
    const decoded = await auth.verifySessionCookie(cookie.value, true);
    const email = (decoded.email || '').toLowerCase();
    if (!email) {
      console.log('[ServerAuth] No email in decoded token');
      return null;
    }

    console.log('[ServerAuth] Session verified for email:', email);

    // Read custom claim role - this is the ONLY source of truth
    const claimRole = (decoded as any).role as AppRole | undefined;
    console.log('[ServerAuth] Custom claim role:', claimRole);

    // Validate role exists and is valid
    if (!claimRole || !['super-admin', 'admin', 'mentor', 'participant'].includes(claimRole)) {
      console.log('[ServerAuth] ⚠️ Invalid or missing role claim:', claimRole);
      return null;
    }

    return { uid: decoded.uid, email, role: claimRole };
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
}

/**
 * Enforce super-admin only access (for sensitive operations like user management)
 */
export async function enforceSuperAdminOrRedirect(): Promise<ServerSession> {
  const session = await getServerSession();
  if (!session) {
    redirect('/login');
  }

  if (session.role !== 'super-admin') {
    console.log('[ServerAuth] enforceSuperAdminOrRedirect: ❌ Not super admin, redirecting. Role:', session.role);
    redirect('/unauthorized');
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
  }

  // Super admin always has access
  if (session.role === 'super-admin') {
    console.log(`[ServerAuth] Super admin accessing ${permissionKey}`);
    return session;
  }

  // Check if admin has specific page permission
  if (session.role === 'admin') {
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
  }

  // Participants and mentors don't have access to admin pages
  console.log(`[ServerAuth] User ${session.email} with role ${session.role} denied access to ${permissionKey}`);
  redirect('/unauthorized');
}

/**
 * Enforce participant or mentor access.
 * Super admins can also access (for viewing profiles).
 */
export async function enforceParticipantOrMentorOrRedirect(): Promise<ServerSession> {
  const session = await getServerSession();
  if (!session) {
    redirect('/login');
  }

  // Allow participants, mentors, and super admin
  if (session.role === 'participant' || session.role === 'mentor' || session.role === 'super-admin') {
    return session;
  }

  redirect('/unauthorized');
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


