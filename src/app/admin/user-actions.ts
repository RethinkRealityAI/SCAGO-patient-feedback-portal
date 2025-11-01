'use server';

import { getAdminAuth, getAdminFirestore } from '@/lib/firebase-admin';
import { enforceAdminInAction } from '@/lib/server-auth';

export type AppRole = 'admin' | 'yep-manager' | 'mentor' | 'participant' | 'user';

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

export async function listPlatformUsers(): Promise<{ users: PlatformUser[] }>
{
  await enforceAdminInAction();
  const auth = getAdminAuth();
  const firestore = getAdminFirestore();

  // Load fallback admin emails for role inference when custom claims are missing
  const adminsDoc = await firestore.collection('config').doc('admins').get();
  const adminEmails: string[] = adminsDoc.exists ? ((adminsDoc.data() as any)?.emails || []) : [];

  // Fetch up to 1000 users (sufficient for current scale); can paginate later
  const result = await auth.listUsers(1000);
  const users: PlatformUser[] = result.users.map((u) => {
    const claims = (u.customClaims || {}) as Record<string, any>;
    const role: AppRole = (claims.role as AppRole) || (adminEmails.includes(u.email || '') ? 'admin' : 'user');
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
}): Promise<{ success: true; uid: string } | { success: false; error: string }>
{
  await enforceAdminInAction();
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

    // Set role claim if provided
    const role: AppRole | undefined = input.role;
    if (role) {
      // Preserve other custom claims (should be empty for new user, but safe)
      const existing = (await auth.getUser(user.uid)).customClaims || {};
      await auth.setCustomUserClaims(user.uid, { ...existing, role });

      // Maintain config documents for backward compatibility
      if (role === 'admin') {
        const adminRef = firestore.collection('config').doc('admins');
        const snap = await adminRef.get();
        const emails: string[] = snap.exists ? ((snap.data() as any)?.emails || []) : [];
        if (!emails.includes(email)) {
          await adminRef.set({ emails: [...emails, email] }, { merge: true });
        }
      } else if (role === 'yep-manager') {
        // Also maintain yep_managers doc for consistency
        const managerRef = firestore.collection('config').doc('yep_managers');
        const snap = await managerRef.get();
        const emails: string[] = snap.exists ? ((snap.data() as any)?.emails || []) : [];
        if (!emails.includes(email)) {
          await managerRef.set({ emails: [...emails, email] }, { merge: true });
        }
      }
    }

    // Apply initial page permissions if provided
    if (input.pagePermissions && input.pagePermissions.length > 0) {
      const permsRef = firestore.collection('config').doc('page_permissions');
      const snap = await permsRef.get();
      const current = snap.exists ? ((snap.data() as any)?.routesByEmail || {}) : {};
      const updated = { ...current, [email]: input.pagePermissions };
      await permsRef.set({ routesByEmail: updated }, { merge: true });
    }

    return { success: true, uid: user.uid };
  } catch (err: any) {
    const message = err?.message || 'Failed to create user';
    return { success: false, error: message };
  }
}

export async function setUserRole(uid: string, role: AppRole): Promise<{ success: true } | { success: false; error: string }>
{
  await enforceAdminInAction();
  const auth = getAdminAuth();
  const firestore = getAdminFirestore();
  try {
    const user = await auth.getUser(uid);
    const email = (user.email || '').toLowerCase();
    const existing = user.customClaims || {};
    await auth.setCustomUserClaims(uid, { ...existing, role });

    // Keep admins doc in sync
    const adminRef = firestore.collection('config').doc('admins');
    const snap = await adminRef.get();
    const emails: string[] = snap.exists ? ((snap.data() as any)?.emails || []) : [];
    if (role === 'admin') {
      if (!emails.includes(email)) {
        await adminRef.set({ emails: [...emails, email] }, { merge: true });
      }
    } else {
      if (emails.includes(email)) {
        await adminRef.set({ emails: emails.filter((e) => e !== email) }, { merge: true });
      }
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to set role' };
  }
}

export async function setUserDisabled(uid: string, disabled: boolean): Promise<{ success: true } | { success: false; error: string }>
{
  await enforceAdminInAction();
  const auth = getAdminAuth();
  try {
    await auth.updateUser(uid, { disabled });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to update status' };
  }
}

export async function updateUserPassword(uid: string, newPassword: string): Promise<{ success: true } | { success: false; error: string }>
{
  await enforceAdminInAction();
  const auth = getAdminAuth();
  if (!newPassword || newPassword.length < 6) return { success: false, error: 'Password must be at least 6 characters' };
  try {
    await auth.updateUser(uid, { password: newPassword });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to update password' };
  }
}

export async function deleteUserById(uid: string): Promise<{ success: true } | { success: false; error: string }>
{
  await enforceAdminInAction();
  const auth = getAdminAuth();
  const firestore = getAdminFirestore();
  try {
    // Remove from admins list if present
    const user = await auth.getUser(uid);
    const email = (user.email || '').toLowerCase();
    const adminRef = firestore.collection('config').doc('admins');
    const snap = await adminRef.get();
    if (snap.exists) {
      const emails: string[] = (snap.data() as any)?.emails || [];
      if (emails.includes(email)) {
        await adminRef.set({ emails: emails.filter((e) => e !== email) }, { merge: true });
      }
    }

    await auth.deleteUser(uid);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to delete user' };
  }
}

export async function setUserPagePermissions(email: string, routes: string[]): Promise<{ success: true } | { success: false; error: string }>
{
  await enforceAdminInAction();
  const firestore = getAdminFirestore();
  try {
    const permsRef = firestore.collection('config').doc('page_permissions');
    const snap = await permsRef.get();
    const current = snap.exists ? ((snap.data() as any)?.routesByEmail || {}) : {};
    const updated = { ...current, [email.toLowerCase()]: routes };
    await permsRef.set({ routesByEmail: updated }, { merge: true });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to set permissions' };
  }
}


