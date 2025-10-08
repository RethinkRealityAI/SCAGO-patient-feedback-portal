import { collection, getDocs, query, where, doc, setDoc, deleteDoc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from './firebase';

export interface FirebaseUser {
  uid: string;
  email: string;
  createdAt: Date;
  lastLoginAt?: Date;
  disabled: boolean;
  emailVerified: boolean;
  isAdmin: boolean;
  metadata?: {
    creationTime?: string;
    lastSignInTime?: string;
  };
}

export interface UserActivity {
  userId: string;
  email: string;
  action: string;
  timestamp: Date;
  details?: Record<string, any>;
}

/**
 * Get all Firebase Auth users (stored in Firestore for management)
 * Note: Actual Firebase Auth user management requires Admin SDK
 */
export async function getAllUsers(): Promise<{ users?: FirebaseUser[]; error?: string }> {
  try {
    // For now, we'll track users we know about from admin list and activity
    const adminEmails = await getAdminEmails();
    const users: FirebaseUser[] = [];

    if (adminEmails.emails) {
      for (const email of adminEmails.emails) {
        // Try to get user details from our tracking collection
        const userDoc = await getDoc(doc(db, 'users', email));
        
        if (userDoc.exists()) {
          const data = userDoc.data();
          users.push({
            uid: userDoc.id,
            email,
            createdAt: data.createdAt?.toDate() || new Date(),
            lastLoginAt: data.lastLoginAt?.toDate(),
            disabled: data.disabled || false,
            emailVerified: data.emailVerified || false,
            isAdmin: true,
            metadata: data.metadata,
          });
        } else {
          // Create basic entry if not exists
          users.push({
            uid: email,
            email,
            createdAt: new Date(),
            disabled: false,
            emailVerified: false,
            isAdmin: true,
          });
        }
      }
    }

    return { users };
  } catch (error) {
    console.error('Error getting users:', error);
    return { error: 'Failed to load users' };
  }
}

async function getAdminEmails(): Promise<{ emails?: string[]; error?: string }> {
  try {
    const adminDoc = await getDoc(doc(db, 'config', 'admins'));
    if (adminDoc.exists()) {
      return { emails: adminDoc.data().emails || [] };
    }
    return { emails: [] };
  } catch (error) {
    return { error: 'Failed to load admin emails' };
  }
}

/**
 * Track user login
 */
export async function trackUserLogin(email: string, uid: string): Promise<void> {
  try {
    const userRef = doc(db, 'users', email);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      await updateDoc(userRef, {
        lastLoginAt: Timestamp.now(),
        'metadata.lastSignInTime': new Date().toISOString(),
      });
    } else {
      await setDoc(userRef, {
        email,
        uid,
        createdAt: Timestamp.now(),
        lastLoginAt: Timestamp.now(),
        disabled: false,
        emailVerified: false,
        metadata: {
          creationTime: new Date().toISOString(),
          lastSignInTime: new Date().toISOString(),
        },
      });
    }

    // Log activity
    await logUserActivity(uid, email, 'login', {});
  } catch (error) {
    console.error('Error tracking login:', error);
  }
}

/**
 * Log user activity
 */
export async function logUserActivity(
  userId: string,
  email: string,
  action: string,
  details?: Record<string, any>
): Promise<void> {
  try {
    const activityRef = doc(collection(db, 'userActivity'));
    await setDoc(activityRef, {
      userId,
      email,
      action,
      timestamp: Timestamp.now(),
      details: details || {},
    });
  } catch (error) {
    console.error('Error logging activity:', error);
  }
}

/**
 * Get user activity logs
 */
export async function getUserActivityLogs(
  limit: number = 50
): Promise<{ activities?: UserActivity[]; error?: string }> {
  try {
    const activitiesSnapshot = await getDocs(
      query(
        collection(db, 'userActivity'),
        // orderBy('timestamp', 'desc'), // Requires index
        // limit(limit)
      )
    );

    const activities: UserActivity[] = activitiesSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        userId: data.userId,
        email: data.email,
        action: data.action,
        timestamp: data.timestamp?.toDate() || new Date(),
        details: data.details,
      };
    }).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, limit);

    return { activities };
  } catch (error) {
    console.error('Error getting activity logs:', error);
    return { error: 'Failed to load activity logs' };
  }
}

/**
 * Get user's login history
 */
export async function getUserLoginHistory(
  email: string
): Promise<{ logins?: Date[]; error?: string }> {
  try {
    const activitiesSnapshot = await getDocs(
      query(
        collection(db, 'userActivity'),
        where('email', '==', email),
        where('action', '==', 'login')
      )
    );

    const logins = activitiesSnapshot.docs.map(doc => {
      const data = doc.data();
      return data.timestamp?.toDate() || new Date();
    }).sort((a, b) => b.getTime() - a.getTime());

    return { logins };
  } catch (error) {
    console.error('Error getting login history:', error);
    return { error: 'Failed to load login history' };
  }
}

/**
 * Note: Firebase Auth user deletion requires Firebase Admin SDK
 * This function only removes from admin list and marks as deleted in tracking
 */
export async function markUserAsDeleted(email: string): Promise<{ success?: boolean; error?: string }> {
  try {
    // Remove from admin list
    const adminDoc = await getDoc(doc(db, 'config', 'admins'));
    if (adminDoc.exists()) {
      const emails = adminDoc.data().emails || [];
      const updatedEmails = emails.filter((e: string) => e !== email);
      await updateDoc(doc(db, 'config', 'admins'), {
        emails: updatedEmails,
      });
    }

    // Mark user as deleted in tracking
    const userRef = doc(db, 'users', email);
    await updateDoc(userRef, {
      disabled: true,
      deletedAt: Timestamp.now(),
    });

    // Log activity
    await logUserActivity('system', email, 'user_deleted', { email });

    return { success: true };
  } catch (error) {
    console.error('Error marking user as deleted:', error);
    return { error: 'Failed to delete user' };
  }
}

/**
 * Get user permissions for specific pages
 */
export async function getUserPermissions(email: string): Promise<{
  canAccessDashboard: boolean;
  canAccessEditor: boolean;
  canAccessAdmin: boolean;
  canViewReports: boolean;
}> {
  const adminDoc = await getDoc(doc(db, 'config', 'admins'));
  const isAdmin = adminDoc.exists() && (adminDoc.data().emails || []).includes(email);

  return {
    canAccessDashboard: isAdmin,
    canAccessEditor: isAdmin,
    canAccessAdmin: isAdmin,
    canViewReports: isAdmin,
  };
}

