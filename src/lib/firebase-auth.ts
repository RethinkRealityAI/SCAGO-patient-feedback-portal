'use client';

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updatePassword as firebaseUpdatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  User,
  AuthError,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { getIdTokenResult } from 'firebase/auth';
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
 * Sign up with email and password
 */
export async function signUp(
  email: string,
  password: string
): Promise<{ user?: User; error?: string }> {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return { user: userCredential.user };
  } catch (error) {
    const authError = error as AuthError;
    let errorMessage = 'Failed to create account';

    switch (authError.code) {
      case 'auth/email-already-in-use':
        errorMessage = 'An account with this email already exists';
        break;
      case 'auth/invalid-email':
        errorMessage = 'Invalid email address';
        break;
      case 'auth/operation-not-allowed':
        errorMessage = 'Email/password accounts are not enabled';
        break;
      case 'auth/weak-password':
        errorMessage = 'Password is too weak. Please use at least 6 characters';
        break;
      default:
        errorMessage = authError.message;
    }

    console.error('Sign up error:', authError);
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
    if (auth.currentUser) {
      try {
        const token = await getIdTokenResult(auth.currentUser, true);
        return (token.claims as any)?.role === 'admin';
      } catch {}
    }
    return false;
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
    if (auth.currentUser) {
      try {
        const token = await getIdTokenResult(auth.currentUser, true);
        return (token.claims as any)?.role === 'yep-manager';
      } catch {}
    }
    return false;
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
    // Claims only
    if (auth.currentUser) {
      try {
        const token = await getIdTokenResult(auth.currentUser, true);
        const role = (token.claims as any)?.role as string | undefined;
        if (role === 'admin') return 'admin';
        if (role === 'yep-manager') return 'yep-manager';
        if (role === 'user') return 'user';
      } catch {}
    }

    // Default role when no claim is present
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

/**
 * Update password for current user (requires reauthentication)
 */
export async function updatePassword(
  currentPassword: string,
  newPassword: string
): Promise<{ error?: string }> {
  const user = auth.currentUser;
  if (!user || !user.email) {
    return { error: 'No user is currently signed in' };
  }

  try {
    // Reauthenticate user before password change
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);

    // Update password
    await firebaseUpdatePassword(user, newPassword);
    return {};
  } catch (error) {
    const authError = error as AuthError;
    let errorMessage = 'Failed to update password';

    switch (authError.code) {
      case 'auth/wrong-password':
        errorMessage = 'Current password is incorrect';
        break;
      case 'auth/weak-password':
        errorMessage = 'New password is too weak. Please use at least 6 characters';
        break;
      case 'auth/requires-recent-login':
        errorMessage = 'Please sign out and sign back in before changing your password';
        break;
      default:
        errorMessage = authError.message;
    }

    console.error('Password update error:', authError);
    return { error: errorMessage };
  }
}

