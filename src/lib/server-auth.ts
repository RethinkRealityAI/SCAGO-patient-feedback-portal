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
 * Custom claims are the source of truth. Falls back to Firestore checks
 * for participant/mentor only if no custom claim is present (legacy support).
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

    // Read custom claim role first; this is our source of truth when present
    const claimRole = (decoded as any).role as AppRole | undefined;
    console.log('[ServerAuth] Custom claim role found:', claimRole);

    if (claimRole === 'admin' || claimRole === 'yep-manager' || claimRole === 'mentor' || claimRole === 'participant' || claimRole === 'user') {
      return { uid: decoded.uid, email, role: claimRole };
    }

    // Participant / Mentor membership by email (fallback for legacy users without claims)
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

    console.log('[ServerAuth] ⚠️ No role claim found; defaulting to user');
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


