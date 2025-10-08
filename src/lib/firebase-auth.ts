'use client';

import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  User,
  AuthError,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

export type { User } from 'firebase/auth';

/**
 * Sign in with email and password
 */
export async function signIn(
  email: string,
  password: string
): Promise<{ user?: User; error?: string }> {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { user: userCredential.user };
  } catch (error) {
    const authError = error as AuthError;
    let errorMessage = 'Failed to sign in';

    switch (authError.code) {
      case 'auth/invalid-email':
        errorMessage = 'Invalid email address';
        break;
      case 'auth/user-disabled':
        errorMessage = 'This account has been disabled';
        break;
      case 'auth/user-not-found':
        errorMessage = 'No account found with this email';
        break;
      case 'auth/wrong-password':
        errorMessage = 'Incorrect password';
        break;
      case 'auth/invalid-credential':
        errorMessage = 'Invalid email or password';
        break;
      case 'auth/too-many-requests':
        errorMessage = 'Too many failed attempts. Please try again later';
        break;
      default:
        errorMessage = authError.message;
    }

    console.error('Sign in error:', authError);
    return { error: errorMessage };
  }
}

/**
 * Sign out current user
 */
export async function signOut(): Promise<{ error?: string }> {
  try {
    await firebaseSignOut(auth);
    return {};
  } catch (error) {
    console.error('Sign out error:', error);
    return { error: 'Failed to sign out' };
  }
}

/**
 * Send password reset email
 */
export async function resetPassword(email: string): Promise<{ error?: string }> {
  try {
    await sendPasswordResetEmail(auth, email);
    return {};
  } catch (error) {
    const authError = error as AuthError;
    let errorMessage = 'Failed to send reset email';

    switch (authError.code) {
      case 'auth/invalid-email':
        errorMessage = 'Invalid email address';
        break;
      case 'auth/user-not-found':
        errorMessage = 'No account found with this email';
        break;
      default:
        errorMessage = authError.message;
    }

    console.error('Password reset error:', authError);
    return { error: errorMessage };
  }
}

/**
 * Check if user is admin
 */
export async function isUserAdmin(email: string | null): Promise<boolean> {
  if (!email) return false;

  try {
    // Check Firestore for admin list
    const adminDoc = await getDoc(doc(db, 'config', 'admins'));
    
    if (adminDoc.exists()) {
      const adminEmails = adminDoc.data().emails || [];
      return adminEmails.includes(email);
    }

    // Fallback: If no config exists, allow specific email
    // TODO: Remove this in production and ensure config/admins exists
    return email === 'admin@scago.com';
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

/**
 * Check if user is YEP Manager
 */
export async function isUserYEPManager(email: string | null): Promise<boolean> {
  if (!email) return false;

  try {
    // Check Firestore for YEP Manager list
    const yepManagerDoc = await getDoc(doc(db, 'config', 'yep_managers'));
    
    if (yepManagerDoc.exists()) {
      const yepManagerEmails = yepManagerDoc.data().emails || [];
      return yepManagerEmails.includes(email);
    }

    // Fallback: If no config exists, allow specific email
    // TODO: Remove this in production and ensure config/yep_managers exists
    return email === 'yep-manager@scago.com';
  } catch (error) {
    console.error('Error checking YEP Manager status:', error);
    return false;
  }
}

/**
 * Get user role (admin, yep-manager, or user)
 */
export async function getUserRole(email: string | null): Promise<'admin' | 'yep-manager' | 'user' | null> {
  if (!email) return null;

  try {
    const [isAdmin, isYEPManager] = await Promise.all([
      isUserAdmin(email),
      isUserYEPManager(email)
    ]);

    if (isAdmin) return 'admin';
    if (isYEPManager) return 'yep-manager';
    return 'user';
  } catch (error) {
    console.error('Error getting user role:', error);
    return null;
  }
}

/**
 * Subscribe to auth state changes
 */
export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

/**
 * Get current user
 */
export function getCurrentUser(): User | null {
  return auth.currentUser;
}

