import admin from 'firebase-admin';

// Initialize Firebase Admin SDK (server-side only)
// This should only be imported in server actions or API routes
function initializeFirebaseAdmin(): admin.app.App {
  // Check if already initialized
  if (admin.apps.length > 0) {
    return admin.apps[0]!;
  }

  // Check if we have the required environment variables
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    console.error('Firebase Admin SDK environment variables:', {
      hasProjectId: !!projectId,
      hasClientEmail: !!clientEmail,
      hasPrivateKey: !!privateKey,
    });
    throw new Error(
      'Missing Firebase Admin credentials. Please set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY environment variables.'
    );
  }

  try {
    return admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, '\n'),
      }),
    });
  } catch (error) {
    console.error('Error initializing Firebase Admin:', error);
    throw error;
  }
}

// Export admin instances
export function getAdminAuth() {
  const app = initializeFirebaseAdmin();
  return admin.auth(app);
}

export function getAdminFirestore() {
  const app = initializeFirebaseAdmin();
  return admin.firestore(app);
}

export function getAdminStorage() {
  const app = initializeFirebaseAdmin();
  return admin.storage(app);
}

// Helper to verify if a user exists
export async function checkUserExists(email: string): Promise<boolean> {
  try {
    const auth = getAdminAuth();
    await auth.getUserByEmail(email);
    return true;
  } catch (error: any) {
    if (error.code === 'auth/user-not-found') {
      return false;
    }
    throw error;
  }
}

// Helper to create or get user
export async function createOrGetUser(email: string): Promise<admin.auth.UserRecord> {
  const auth = getAdminAuth();
  
  try {
    // Try to get existing user
    return await auth.getUserByEmail(email);
  } catch (error: any) {
    if (error.code === 'auth/user-not-found') {
      // Create new user
      return await auth.createUser({
        email,
        emailVerified: false,
      });
    }
    throw error;
  }
}

