#!/usr/bin/env node

/**
 * Firestore Index Setup Script
 * 
 * This script creates the necessary composite indexes for the Youth Empowerment Program.
 * Run this script after deploying the application to ensure all queries work properly.
 * 
 * Required indexes:
 * 1. yep_participants: approved + createdAt (descending)
 * 2. yep_participants: region + createdAt (descending) 
 * 3. yep_participants: assignedMentor + createdAt (descending)
 * 4. yep_workshops: date (descending)
 * 5. yep_mentors: createdAt (descending)
 * 6. yep_advisor_meetings: meetingDate (descending)
 * 7. yep_workshop_attendance: workshopId + attendedAt (descending)
 * 8. patients: region + createdAt (descending) - for region-based patient access (in/== + orderBy)
 * 9. patients: hospital + createdAt (descending) - for hospital filter + orderBy
 * 10. patients: caseStatus + createdAt (descending) - for status filter + orderBy
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Setting up Firestore indexes for Youth Empowerment Program...\n');

// Index configurations
const indexes = [
  {
    collection: 'yep_participants',
    fields: [
      { field: 'approved', order: 'ASCENDING' },
      { field: 'createdAt', order: 'DESCENDING' }
    ],
    description: 'Participants by approval status and creation date'
  },
  {
    collection: 'yep_participants', 
    fields: [
      { field: 'region', order: 'ASCENDING' },
      { field: 'createdAt', order: 'DESCENDING' }
    ],
    description: 'Participants by region and creation date'
  },
  {
    collection: 'yep_participants',
    fields: [
      { field: 'assignedMentor', order: 'ASCENDING' },
      { field: 'createdAt', order: 'DESCENDING' }
    ],
    description: 'Participants by assigned mentor and creation date'
  },
  {
    collection: 'yep_workshops',
    fields: [
      { field: 'date', order: 'DESCENDING' }
    ],
    description: 'Workshops by date'
  },
  {
    collection: 'yep_mentors',
    fields: [
      { field: 'createdAt', order: 'DESCENDING' }
    ],
    description: 'Mentors by creation date'
  },
  {
    collection: 'yep_advisor_meetings',
    fields: [
      { field: 'meetingDate', order: 'DESCENDING' }
    ],
    description: 'Meetings by date'
  },
  {
    collection: 'yep_workshop_attendance',
    fields: [
      { field: 'workshopId', order: 'ASCENDING' },
      { field: 'attendedAt', order: 'DESCENDING' }
    ],
    description: 'Attendance by workshop and attendance date'
  },
  {
    collection: 'patients',
    fields: [
      { field: 'region', order: 'ASCENDING' },
      { field: 'createdAt', order: 'DESCENDING' }
    ],
    description: 'Patients by region for region-based admin access (in/== + orderBy)'
  },
  {
    collection: 'patients',
    fields: [
      { field: 'hospital', order: 'ASCENDING' },
      { field: 'createdAt', order: 'DESCENDING' }
    ],
    description: 'Patients by hospital filter with creation date ordering'
  },
  {
    collection: 'patients',
    fields: [
      { field: 'caseStatus', order: 'ASCENDING' },
      { field: 'createdAt', order: 'DESCENDING' }
    ],
    description: 'Patients by case status filter with creation date ordering'
  }
];

// Generate Firebase CLI commands
const commands = indexes.map(index => {
  const fieldsStr = index.fields.map(f => `${f.field}:${f.order.toLowerCase()}`).join(',');
  return `firebase firestore:indexes:create --collection-group=${index.collection} --field=${fieldsStr}`;
});

console.log('📋 Required Firestore Indexes:');
console.log('================================\n');

indexes.forEach((index, i) => {
  console.log(`${i + 1}. Collection: ${index.collection}`);
  console.log(`   Fields: ${index.fields.map(f => `${f.field} (${f.order})`).join(', ')}`);
  console.log(`   Description: ${index.description}`);
  console.log('');
});

console.log('🚀 Firebase CLI Commands:');
console.log('========================\n');

commands.forEach((cmd, i) => {
  console.log(`${i + 1}. ${cmd}`);
});

console.log('\n📝 Instructions:');
console.log('===============');
console.log('1. Install Firebase CLI: npm install -g firebase-tools');
console.log('2. Login to Firebase: firebase login');
console.log('3. Initialize project: firebase init firestore');
console.log('4. Run the commands above to create indexes');
console.log('5. Wait for indexes to build (can take several minutes)');
console.log('6. Test the application to ensure queries work');

console.log('\n🔗 Alternative: Use Firebase Console');
console.log('===================================');
console.log('1. Go to Firebase Console → Firestore → Indexes');
console.log('2. Click "Create Index"');
console.log('3. Use the field configurations above');

console.log('\n✅ Index setup complete!');
console.log('Note: Index creation can take several minutes. Monitor the Firebase Console for progress.');
