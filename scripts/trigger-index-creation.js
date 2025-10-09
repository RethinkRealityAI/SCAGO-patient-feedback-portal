#!/usr/bin/env node

/**
 * Script to trigger Firestore index creation by running queries
 * This will generate error messages with direct links to create the required indexes
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, orderBy, getDocs } = require('firebase/firestore');

// Firebase config (you'll need to add your actual config)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

async function triggerIndexCreation() {
  try {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    console.log('🔍 Triggering Firestore queries to generate index creation links...\n');

    // Query 1: yep_participants with approved + createdAt
    console.log('1. Testing yep_participants query (approved + createdAt)...');
    try {
      const q1 = query(
        collection(db, 'yep_participants'),
        where('approved', '==', true),
        orderBy('createdAt', 'desc')
      );
      await getDocs(q1);
      console.log('   ✅ Index already exists or query succeeded');
    } catch (error) {
      console.log('   ❌ Index needed - Check error message for creation link');
      console.log('   Error:', error.message);
    }

    // Query 2: yep_participants with region + createdAt
    console.log('\n2. Testing yep_participants query (region + createdAt)...');
    try {
      const q2 = query(
        collection(db, 'yep_participants'),
        where('region', '==', 'Toronto'),
        orderBy('createdAt', 'desc')
      );
      await getDocs(q2);
      console.log('   ✅ Index already exists or query succeeded');
    } catch (error) {
      console.log('   ❌ Index needed - Check error message for creation link');
      console.log('   Error:', error.message);
    }

    // Query 3: yep_participants with assignedMentor + createdAt
    console.log('\n3. Testing yep_participants query (assignedMentor + createdAt)...');
    try {
      const q3 = query(
        collection(db, 'yep_participants'),
        where('assignedMentor', '==', 'mentor1'),
        orderBy('createdAt', 'desc')
      );
      await getDocs(q3);
      console.log('   ✅ Index already exists or query succeeded');
    } catch (error) {
      console.log('   ❌ Index needed - Check error message for creation link');
      console.log('   Error:', error.message);
    }

    // Query 4: yep_workshops with date
    console.log('\n4. Testing yep_workshops query (date)...');
    try {
      const q4 = query(
        collection(db, 'yep_workshops'),
        orderBy('date', 'desc')
      );
      await getDocs(q4);
      console.log('   ✅ Index already exists or query succeeded');
    } catch (error) {
      console.log('   ❌ Index needed - Check error message for creation link');
      console.log('   Error:', error.message);
    }

    // Query 5: yep_mentors with createdAt
    console.log('\n5. Testing yep_mentors query (createdAt)...');
    try {
      const q5 = query(
        collection(db, 'yep_mentors'),
        orderBy('createdAt', 'desc')
      );
      await getDocs(q5);
      console.log('   ✅ Index already exists or query succeeded');
    } catch (error) {
      console.log('   ❌ Index needed - Check error message for creation link');
      console.log('   Error:', error.message);
    }

    // Query 6: yep_advisor_meetings with meetingDate
    console.log('\n6. Testing yep_advisor_meetings query (meetingDate)...');
    try {
      const q6 = query(
        collection(db, 'yep_advisor_meetings'),
        orderBy('meetingDate', 'desc')
      );
      await getDocs(q6);
      console.log('   ✅ Index already exists or query succeeded');
    } catch (error) {
      console.log('   ❌ Index needed - Check error message for creation link');
      console.log('   Error:', error.message);
    }

    // Query 7: yep_workshop_attendance with workshopId + attendedAt
    console.log('\n7. Testing yep_workshop_attendance query (workshopId + attendedAt)...');
    try {
      const q7 = query(
        collection(db, 'yep_workshop_attendance'),
        where('workshopId', '==', 'workshop1'),
        orderBy('attendedAt', 'desc')
      );
      await getDocs(q7);
      console.log('   ✅ Index already exists or query succeeded');
    } catch (error) {
      console.log('   ❌ Index needed - Check error message for creation link');
      console.log('   Error:', error.message);
    }

    console.log('\n✅ Index creation trigger complete!');
    console.log('📋 Next steps:');
    console.log('1. Look for error messages above that contain index creation links');
    console.log('2. Click on the provided links to create the indexes');
    console.log('3. Wait for indexes to build (5-15 minutes)');
    console.log('4. Test your YEP forms to ensure they work');

  } catch (error) {
    console.error('❌ Error running index trigger script:', error);
  }
}

// Load environment variables
require('dotenv').config();

// Run the script
triggerIndexCreation();
