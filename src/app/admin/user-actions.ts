'use server';

// Dynamic imports for server-only modules
import { enforceAdminInAction } from '@/lib/server-auth';

export type AppRole = 'super-admin' | 'admin' | 'mentor' | 'participant';

export interface PlatformUser {
  uid: string;
  email: string;
  displayName?: string | null;
  disabled: boolean;
  emailVerified: boolean;
  role: AppRole;
  createdAt?: string;
  lastLoginAt?: string;
}

export async function listPlatformUsers(): Promise<{ users: PlatformUser[] }> {
  await enforceAdminInAction();
  const { getAdminAuth } = await import('@/lib/firebase-admin');
  const auth = getAdminAuth();

  const result = await auth.listUsers(1000);
  const users: PlatformUser[] = result.users.map((u) => {
    const claims = (u.customClaims || {}) as Record<string, any>;
    // Default to 'participant' if no role is set (should rarely happen)
    const role: AppRole = (claims.role as AppRole) || 'participant';
    return {
      uid: u.uid,
      email: u.email || '',
      displayName: u.displayName,
      disabled: u.disabled,
      emailVerified: !!u.emailVerified,
      role,
      createdAt: u.metadata?.creationTime || undefined,
      lastLoginAt: u.metadata?.lastSignInTime || undefined,
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

    // Set page permissions if provided (for admin role)
    if (input.pagePermissions && input.pagePermissions.length > 0) {
      const permsRef = firestore.collection('config').doc('page_permissions');
      const snap = await permsRef.get();
      const current = snap.exists ? ((snap.data() as any)?.routesByEmail || {}) : {};
      const updated = { ...current, [email]: input.pagePermissions };
      await permsRef.set({ routesByEmail: updated }, { merge: true });
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

export async function setUserPagePermissions(email: string, routes: string[]): Promise<{ success: true } | { success: false; error: string }> {
  await enforceAdminInAction();
  const { getAdminAuth, getAdminFirestore } = await import('@/lib/firebase-admin');
  const firestore = getAdminFirestore();
  const auth = getAdminAuth();

  try {
    const permsRef = firestore.collection('config').doc('page_permissions');
    const snap = await permsRef.get();
    const current = snap.exists ? ((snap.data() as any)?.routesByEmail || {}) : {};
    const updated = { ...current, [email.toLowerCase()]: routes };
    await permsRef.set({ routesByEmail: updated }, { merge: true });

    // Log permission change
    try {
      const user = await auth.getUserByEmail(email);
      await logUserActivity(user.uid, email, 'permissions_changed', {
        permissions: routes
      });
    } catch (err) {
      console.error('Failed to log permission change:', err);
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to set permissions' };
  }
}

/**
 * Get page permissions for a user by email
 */
export async function getUserPagePermissions(email: string): Promise<{ permissions?: string[]; error?: string }> {
  await enforceAdminInAction();
  const { getAdminFirestore } = await import('@/lib/firebase-admin');
  const firestore = getAdminFirestore();

  try {
    const permsRef = firestore.collection('config').doc('page_permissions');
    const snap = await permsRef.get();

    if (!snap.exists) {
      return { permissions: [] };
    }

    const routesByEmail = (snap.data() as any)?.routesByEmail || {};
    const permissions = routesByEmail[email.toLowerCase()] || [];

    return { permissions };
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


