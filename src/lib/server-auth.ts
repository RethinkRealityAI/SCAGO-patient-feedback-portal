import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getAdminAuth, getAdminFirestore } from '@/lib/firebase-admin';

export type AppRole = 'admin' | 'yep-manager' | 'participant' | 'mentor' | 'user';

export interface ServerSession {
  uid: string;
  email: string;
  role: AppRole;
}

/**
 * Verify the Firebase session cookie and resolve the application role.
 * Falls back to Firestore membership checks if no custom claim is present.
 */
export async function getServerSession(): Promise<ServerSession | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get('__session');
  if (!cookie?.value) {
    console.log('[ServerAuth] No session cookie found');
    return null;
  }

  const auth = getAdminAuth();
  const firestore = getAdminFirestore();

  try {
    const decoded = await auth.verifySessionCookie(cookie.value, true);
    const email = (decoded.email || '').toLowerCase();
    if (!email) {
      console.log('[ServerAuth] No email in decoded token');
      return null;
    }

    console.log('[ServerAuth] Session verified for email:', email);

    // Check custom claim role, but don't trust "user" - always verify via Firestore
    const claimRole = (decoded as any).role as AppRole | undefined;
    console.log('[ServerAuth] Custom claim role found:', claimRole);

    // 1) ALWAYS check Firestore config/admins first (source of truth)
    // Even if custom claim says "user", if email is in admins list, user is admin
    const adminDoc = await firestore.collection('config').doc('admins').get();
    const adminEmails: string[] = adminDoc.exists 
      ? (((adminDoc.data() as any)?.emails || []).map((e: string) => (e || '').toLowerCase())) 
      : [];
    
    console.log('[ServerAuth] Admin check - doc exists:', adminDoc.exists, 'admin emails:', adminEmails, 'checking:', email);
    
    if (adminEmails.includes(email)) {
      console.log('[ServerAuth] ✅ Admin role confirmed via Firestore (overriding custom claim)');
      return { uid: decoded.uid, email, role: 'admin' };
    }

    // 2) Check YEP manager via config/yep_managers
    const managerDoc = await firestore.collection('config').doc('yep_managers').get();
    const managerEmails: string[] = managerDoc.exists 
      ? (((managerDoc.data() as any)?.emails || []).map((e: string) => (e || '').toLowerCase())) 
      : [];
    
    console.log('[ServerAuth] YEP Manager check - doc exists:', managerDoc.exists, 'manager emails:', managerEmails);
    
    if (managerEmails.includes(email)) {
      console.log('[ServerAuth] ✅ YEP Manager role confirmed via Firestore (overriding custom claim)');
      return { uid: decoded.uid, email, role: 'yep-manager' };
    }

    // 3) If custom claim is "admin" or "yep-manager", trust it (even if not in Firestore)
    // This handles edge cases where custom claims are set but Firestore is out of sync
    if (claimRole === 'admin' || claimRole === 'yep-manager') {
      console.log('[ServerAuth] Using trusted custom claim role:', claimRole);
      return { uid: decoded.uid, email, role: claimRole };
    }

    // 4) Participant / Mentor membership by email
    // Check these AFTER admin/manager to avoid conflicts
    const participantQ = await firestore
      .collection('yep_participants')
      .where('email', '==', email)
      .limit(1)
      .get();
    if (!participantQ.empty) {
      console.log('[ServerAuth] ✅ Participant role confirmed');
      return { uid: decoded.uid, email, role: 'participant' };
    }

    const mentorQ = await firestore
      .collection('yep_mentors')
      .where('email', '==', email)
      .limit(1)
      .get();
    if (!mentorQ.empty) {
      console.log('[ServerAuth] ✅ Mentor role confirmed');
      return { uid: decoded.uid, email, role: 'mentor' };
    }

    console.log('[ServerAuth] ⚠️ No role match found, defaulting to user');
    return { uid: decoded.uid, email, role: 'user' };
  } catch (err: any) {
    // Invalid or expired cookie
    console.error('[ServerAuth] Error verifying session cookie:', err.message);
    return null;
  }
}

export async function enforceAdminOrRedirect(): Promise<ServerSession> {
  const session = await getServerSession();
  if (!session) {
    console.log('[ServerAuth] enforceAdminOrRedirect: No session, redirecting to login');
    redirect('/login');
  }
  
  console.log('[ServerAuth] enforceAdminOrRedirect: Session role is:', session.role, 'email:', session.email);
  
  if (session.role !== 'admin') {
    console.log('[ServerAuth] enforceAdminOrRedirect: ❌ Not admin, redirecting to unauthorized. Role:', session.role);
    redirect('/unauthorized');
  }
  
  console.log('[ServerAuth] enforceAdminOrRedirect: ✅ Admin access granted');
  return session;
}

/**
 * Allow access to YEP portal for admins, YEP managers, or users with explicit 'yep-portal' permission.
 */
export async function enforceYEPAccessOrRedirect(): Promise<ServerSession> {
  const session = await getServerSession();
  if (!session) {
    redirect('/login');
  }
  if (session.role === 'admin' || session.role === 'yep-manager') {
    return session;
  }
  // Check explicit page permission
  const firestore = getAdminFirestore();
  const permsDoc = await firestore.collection('config').doc('page_permissions').get();
  const routesByEmail = permsDoc.exists ? ((permsDoc.data() as any)?.routesByEmail || {}) : {};
  const allowed: string[] = routesByEmail[session.email] || [];
  if (allowed.includes('yep-portal')) {
    return session;
  }
  redirect('/unauthorized');
}

export async function enforceParticipantOrMentorOrRedirect(): Promise<ServerSession> {
  const session = await getServerSession();
  if (!session) {
    redirect('/login');
  }
  if (session.role === 'participant' || session.role === 'mentor') {
    return session;
  }
  // Admins are allowed everywhere by default; others blocked
  if (session.role === 'admin' || session.role === 'yep-manager') {
    return session;
  }
  redirect('/unauthorized');
}

export async function enforceAdminInAction(): Promise<void> {
  const session = await getServerSession();
  if (!session || session.role !== 'admin') {
    throw new Error('Unauthorized: admin access required');
  }
}


