import admin from 'firebase-admin';

// Initialize Firebase Admin SDK (server-side only)
// This should only be imported in server actions or API routes
function initializeFirebaseAdmin(): admin.app.App {
  // Check if already initialized
  if (admin.apps.length > 0) {
    return admin.apps[0]!;
  }

  // Helper to normalize private key strings across OS/CI
  const normalizePrivateKey = (key: string) =>
    key
      .replace(/^"|"$/g, '') // strip surrounding quotes if present
      .replace(/\\n/g, '\n'); // convert escaped newlines

  // Prefer explicit FIREBASE_* variables
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKeyEnv = process.env.FIREBASE_PRIVATE_KEY;
  const privateKeyB64 = process.env.FIREBASE_PRIVATE_KEY_BASE64;

  // Alternate ways to provide credentials
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT || process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  const serviceAccountB64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 || process.env.GOOGLE_SERVICE_ACCOUNT_BASE64;

  try {
    // 1) Explicit FIREBASE_* triple (or base64 key)
    if (projectId && clientEmail && (privateKeyEnv || privateKeyB64)) {
      const privateKey = privateKeyEnv
        ? normalizePrivateKey(privateKeyEnv)
        : normalizePrivateKey(Buffer.from(privateKeyB64 as string, 'base64').toString('utf8'));

      return admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
    }

    // 2) Full service account JSON via env (plain or base64)
    if (serviceAccountJson || serviceAccountB64) {
      const json = serviceAccountJson
        ? serviceAccountJson
        : Buffer.from(serviceAccountB64 as string, 'base64').toString('utf8');

      const parsed = JSON.parse(json);
      if (parsed.private_key) {
        parsed.private_key = normalizePrivateKey(parsed.private_key);
      }

      return admin.initializeApp({
        credential: admin.credential.cert(parsed),
      });
    }

    // 3) Application default credentials (GOOGLE_APPLICATION_CREDENTIALS points to JSON file)
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      return admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
    }

    // If we hit here, we have no usable credentials
    console.error('Firebase Admin SDK environment variables:', {
      hasProjectId: !!projectId,
      hasClientEmail: !!clientEmail,
      hasPrivateKey: !!privateKeyEnv || !!privateKeyB64,
      hasServiceAccountJson: !!serviceAccountJson || !!serviceAccountB64,
      hasApplicationDefault: !!process.env.GOOGLE_APPLICATION_CREDENTIALS,
    });
    throw new Error(
      'Missing Firebase Admin credentials. Provide FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY (or *_BASE64), or set FIREBASE_SERVICE_ACCOUNT(_BASE64), or GOOGLE_APPLICATION_CREDENTIALS.'
    );
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

