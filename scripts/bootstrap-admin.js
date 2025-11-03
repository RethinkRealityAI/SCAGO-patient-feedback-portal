/**
 * Bootstrap Super Admin Script
 *
 * This script sets the 'super-admin' role for your first admin user.
 * Run this ONCE to give yourself super admin access.
 *
 * Usage:
 *   node scripts/bootstrap-admin.js your-email@example.com
 *
 * Or set as default (hardcoded):
 *   node scripts/bootstrap-admin.js
 */

const admin = require('firebase-admin');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

// ========================================
// DEFAULT SUPER ADMIN EMAIL (CHANGE THIS)
// ========================================
const DEFAULT_SUPER_ADMIN_EMAIL = 'tech@sicklecellanemia.ca';

// Initialize Firebase Admin
function initializeFirebase() {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  // Try different credential sources
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }

  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    return admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
  }

  throw new Error(
    'Firebase credentials not found. Please set one of:\n' +
    '  - FIREBASE_SERVICE_ACCOUNT (full JSON)\n' +
    '  - FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY\n' +
    '  - GOOGLE_APPLICATION_CREDENTIALS (path to service account JSON)'
  );
}

async function setSuperAdmin(email) {
  try {
    console.log('\n🔧 Initializing Firebase Admin SDK...');
    initializeFirebase();
    const auth = admin.auth();

    console.log(`\n🔍 Looking up user: ${email}`);

    // Get user by email
    let user;
    try {
      user = await auth.getUserByEmail(email);
      console.log(`✅ User found: ${user.uid}`);
    } catch (err) {
      if (err.code === 'auth/user-not-found') {
        console.error(`\n❌ ERROR: No user found with email: ${email}`);
        console.log('\nℹ️  You need to create this user first. Options:');
        console.log('   1. Sign up at /login on your app');
        console.log('   2. Create user in Firebase Console');
        console.log('   3. Use the Firebase Admin SDK to create the user\n');
        process.exit(1);
      }
      throw err;
    }

    // Check existing custom claims
    const existingClaims = user.customClaims || {};
    const existingRole = existingClaims.role;

    console.log(`📋 Current role: ${existingRole || '(none)'}`);

    // Set super-admin role
    console.log('\n🔐 Setting super-admin custom claim...');
    await auth.setCustomUserClaims(user.uid, {
      ...existingClaims,
      role: 'super-admin'
    });

    console.log('✅ Custom claim set successfully!');

    // Verify
    const updatedUser = await auth.getUser(user.uid);
    const newRole = (updatedUser.customClaims || {}).role;

    console.log(`\n✅ SUCCESS! ${email} is now a super-admin`);
    console.log(`   Role: ${existingRole || '(none)'} → super-admin`);

    console.log('\n📝 Next steps:');
    console.log('   1. Logout if currently logged in');
    console.log('   2. Login again at /login');
    console.log('   3. Access /admin to manage users\n');

  } catch (err) {
    console.error('\n❌ ERROR:', err.message);
    console.error(err);
    process.exit(1);
  }
}

// Main execution
const emailArg = process.argv[2];
const targetEmail = emailArg || DEFAULT_SUPER_ADMIN_EMAIL;

if (!targetEmail || !targetEmail.includes('@')) {
  console.error('\n❌ ERROR: Invalid email address');
  console.log('\nUsage:');
  console.log('  node scripts/bootstrap-admin.js your-email@example.com');
  console.log('\nOr edit the DEFAULT_SUPER_ADMIN_EMAIL in this script\n');
  process.exit(1);
}

console.log('┌─────────────────────────────────────────┐');
console.log('│   🚀 BOOTSTRAP SUPER ADMIN SCRIPT      │');
console.log('└─────────────────────────────────────────┘');
console.log(`\n📧 Target email: ${targetEmail}`);

setSuperAdmin(targetEmail);
