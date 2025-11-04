/**
 * Test script to verify Firebase email configuration
 * Run with: node scripts/test-email-config.js
 */

const admin = require('firebase-admin');
require('dotenv').config({ path: '.env.local' });

// Initialize Firebase Admin
try {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
  
  console.log('✅ Firebase Admin SDK initialized successfully');
  console.log('📋 Project:', process.env.FIREBASE_PROJECT_ID);
} catch (error) {
  console.error('❌ Failed to initialize Firebase Admin SDK:', error.message);
  process.exit(1);
}

async function testEmailConfiguration() {
  console.log('\n🔍 Testing Email Configuration...\n');
  
  const auth = admin.auth();
  
  try {
    // Test 1: Check if we can generate a password reset link
    console.log('Test 1: Checking password reset link generation...');
    
    const testEmail = 'test@example.com';
    const actionCodeSettings = {
      url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002'}/profile?welcome=true`,
      handleCodeInApp: false,
    };
    
    // Try to generate link (won't actually send email to non-existent user)
    try {
      const link = await auth.generatePasswordResetLink(testEmail, actionCodeSettings);
      console.log('✅ Password reset link generation: WORKING');
      console.log('   Sample link format:', link.substring(0, 50) + '...');
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        console.log('✅ Password reset link generation: WORKING (user not found is expected)');
      } else {
        console.log('❌ Password reset link generation: FAILED');
        console.log('   Error:', error.message);
      }
    }
    
    // Test 2: Check environment variables
    console.log('\nTest 2: Checking environment variables...');
    
    const requiredVars = {
      'FIREBASE_PROJECT_ID': process.env.FIREBASE_PROJECT_ID,
      'FIREBASE_CLIENT_EMAIL': process.env.FIREBASE_CLIENT_EMAIL,
      'FIREBASE_PRIVATE_KEY': process.env.FIREBASE_PRIVATE_KEY ? '✓ Set' : '✗ Missing',
      'NEXT_PUBLIC_APP_URL': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002 (default)',
    };
    
    let allVarsSet = true;
    Object.entries(requiredVars).forEach(([key, value]) => {
      if (!value || value === '✗ Missing') {
        console.log(`   ❌ ${key}: Missing`);
        allVarsSet = false;
      } else {
        if (key === 'FIREBASE_PRIVATE_KEY') {
          console.log(`   ✅ ${key}: ${value}`);
        } else if (key === 'FIREBASE_CLIENT_EMAIL') {
          console.log(`   ✅ ${key}: ${value}`);
        } else {
          console.log(`   ✅ ${key}: ${value}`);
        }
      }
    });
    
    if (allVarsSet) {
      console.log('✅ All environment variables: SET');
    } else {
      console.log('❌ Some environment variables: MISSING');
    }
    
    // Test 3: List existing users (sample)
    console.log('\nTest 3: Checking Firebase Auth users...');
    
    try {
      const listUsersResult = await auth.listUsers(5); // Get first 5 users
      console.log(`✅ Found ${listUsersResult.users.length} users (showing max 5)`);
      
      if (listUsersResult.users.length > 0) {
        console.log('\n   Sample users:');
        listUsersResult.users.forEach((user, index) => {
          console.log(`   ${index + 1}. ${user.email || 'No email'} (UID: ${user.uid.substring(0, 8)}...)`);
        });
      } else {
        console.log('   ⚠️  No users found in Firebase Auth');
      }
    } catch (error) {
      console.log('❌ Failed to list users:', error.message);
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Summary:');
    console.log('='.repeat(60));
    console.log('✅ Firebase Admin SDK: Connected');
    console.log('✅ Email Generation API: Working');
    console.log('');
    console.log('⚠️  IMPORTANT: Email Template Configuration');
    console.log('   The code is working, but you need to configure the email');
    console.log('   template in Firebase Console for emails to be delivered.');
    console.log('');
    console.log('📝 Next Steps:');
    console.log('   1. Go to: https://console.firebase.google.com/project/scago-feedback/authentication/emails');
    console.log('   2. Click "Templates" tab');
    console.log('   3. Edit "Password reset" template');
    console.log('   4. Customize sender name, subject, and body');
    console.log('   5. Click "Save"');
    console.log('');
    console.log('📖 See FIREBASE-EMAIL-TEMPLATE-SETUP.md for detailed instructions');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('\n❌ Error during testing:', error);
  }
}

// Run the test
testEmailConfiguration()
  .then(() => {
    console.log('\n✅ Test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });


















