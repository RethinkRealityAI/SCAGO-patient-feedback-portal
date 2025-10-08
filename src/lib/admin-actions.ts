import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { logUserActivity } from './firebase-admin-users';

/**
 * Get list of admin emails from Firestore
 */
export async function getAdminEmails(): Promise<{ emails?: string[]; error?: string }> {
  try {
    const adminDoc = await getDoc(doc(db, 'config', 'admins'));
    
    if (adminDoc.exists()) {
      const emails = adminDoc.data().emails || [];
      return { emails };
    }
    
    return { emails: [] };
  } catch (error) {
    console.error('Error getting admin emails:', error);
    return { error: 'Failed to load admin list' };
  }
}

/**
 * Add email to admin list
 */
export async function addAdminEmail(email: string, addedBy?: string): Promise<{ success?: boolean; error?: string }> {
  try {
    if (!email || !email.includes('@')) {
      return { error: 'Invalid email address' };
    }

    const adminDocRef = doc(db, 'config', 'admins');
    const adminDoc = await getDoc(adminDocRef);

    if (!adminDoc.exists()) {
      // Create the document if it doesn't exist
      await setDoc(adminDocRef, {
        emails: [email],
      });
    } else {
      // Check if already admin
      const currentEmails = adminDoc.data().emails || [];
      if (currentEmails.includes(email)) {
        return { error: 'User is already an admin' };
      }
      
      // Add to existing array
      await updateDoc(adminDocRef, {
        emails: arrayUnion(email),
      });
    }

    // Log activity
    if (addedBy) {
      await logUserActivity('system', addedBy, 'admin_added', { newAdminEmail: email });
    }

    return { success: true };
  } catch (error) {
    console.error('Error adding admin email:', error);
    return { error: 'Failed to add admin access' };
  }
}

/**
 * Remove email from admin list
 */
export async function removeAdminEmail(email: string, removedBy?: string): Promise<{ success?: boolean; error?: string }> {
  try {
    const adminDocRef = doc(db, 'config', 'admins');
    const adminDoc = await getDoc(adminDocRef);
    
    if (!adminDoc.exists()) {
      return { error: 'Admin configuration not found' };
    }
    
    const currentEmails = adminDoc.data().emails || [];
    if (currentEmails.length === 1) {
      return { error: 'Cannot remove the last admin' };
    }
    
    await updateDoc(adminDocRef, {
      emails: arrayRemove(email),
    });

    // Log activity
    if (removedBy) {
      await logUserActivity('system', removedBy, 'admin_removed', { removedEmail: email });
    }

    return { success: true };
  } catch (error) {
    console.error('Error removing admin email:', error);
    return { error: 'Failed to remove admin access' };
  }
}

