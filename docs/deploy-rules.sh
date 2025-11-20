#!/bin/bash

# Deploy Firebase Security Rules
# This script deploys both Firestore and Storage security rules to Firebase

set -e

echo "🔥 Deploying Firebase Security Rules..."
echo ""

# Check if firebase-tools is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Error: firebase-tools is not installed"
    echo "   Install it with: npm install -g firebase-tools"
    exit 1
fi

# Check if user is logged in
if ! firebase projects:list &> /dev/null; then
    echo "❌ Error: Not logged in to Firebase"
    echo "   Run: firebase login"
    exit 1
fi

# Get current project
PROJECT=$(firebase use 2>&1 | grep "Active project" | cut -d':' -f2 | xargs || echo "")

if [ -z "$PROJECT" ]; then
    echo "❌ Error: No Firebase project selected"
    echo "   Run: firebase use <project-id>"
    exit 1
fi

echo "📦 Current project: $PROJECT"
echo ""

# Deploy Firestore rules
echo "📄 Deploying Firestore rules..."
firebase deploy --only firestore:rules

# Deploy Storage rules
echo "📦 Deploying Storage rules..."
firebase deploy --only storage:rules

echo ""
echo "✅ All security rules deployed successfully!"
echo ""
echo "🔒 Admin access is now properly configured:"
echo "   - Admins with role 'admin' or 'super-admin' have full access"
echo "   - YEP Managers with role 'yep-manager' have YEP access"
echo "   - Participants/Mentors can only access their own files"
