# Immediate Fix for 403 Document Upload Error

## Problem
Admins getting 403 error when uploading documents to participant profiles.

## Quick Fix (2 Steps)

### Step 1: Deploy Updated Storage Rules

```bash
cd /path/to/SCAGO-patient-feedback-portal
firebase deploy --only storage:rules
```

Or use the deployment script:
```bash
cd docs
./deploy-rules.sh
```

This will take **30 seconds** and fix the permission checking.

### Step 2: Verify Admin Custom Claims

The admin user needs to have a custom claim set on their account.

#### Check if you have custom claims:
1. Open browser console (F12)
2. Run this code:
```javascript
const user = firebase.auth().currentUser;
const token = await user.getIdToken(true);
const decoded = JSON.parse(atob(token.split('.')[1]));
console.log('Your role:', decoded.role);
```

#### If you see `role: undefined` or no role:

You need to set the custom claim. **Use the provided bootstrap script (easiest way):**

**✅ EASIEST: Use the Bootstrap Script**

The project includes a script to set admin roles:

```bash
# Make sure you have Firebase credentials set up in .env.local
# Then run:
node scripts/bootstrap-admin.js your-email@example.com
```

This will:
1. Find the user by email
2. Set `role: 'super-admin'` on their account
3. Display confirmation

**Alternative: Manual Setup with Firebase Admin SDK**

If the bootstrap script doesn't work, use this Node.js code:

```javascript
const admin = require('firebase-admin');
// Initialize with your service account
const serviceAccount = require('./path/to/serviceAccount.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const userEmail = 'youremail@example.com';
const userRecord = await admin.auth().getUserByEmail(userEmail);
await admin.auth().setCustomUserClaims(userRecord.uid, { role: 'super-admin' });

console.log('Admin role set! User must sign out and back in.');
```

### Step 3: Refresh Your Session

After custom claims are set:
1. **Sign out** of the application
2. **Sign back in**
3. Try uploading a document again

Or force refresh in browser console:
```javascript
await firebase.auth().currentUser.getIdToken(true);
window.location.reload();
```

## Verification

After completing the steps above, verify the fix:

1. Go to Youth Empowerment Dashboard
2. Open a participant profile (or create new)
3. Try uploading a document
4. Should work without 403 error! ✅

## What Changed?

- **Before:** Storage rules checked for email in `/config/admins` Firestore document
- **After:** Storage rules check for `role` in authentication token (custom claims)

This matches how Firestore rules work and is more secure and performant.

## Still Having Issues?

### Check Browser Console
Look for detailed error messages:
```
FirebaseError: User does not have permission...
```

### Verify Rules Deployed
```bash
firebase deploy --only storage:rules --project your-project-id
```

### Check Token
```javascript
const token = await firebase.auth().currentUser.getIdToken(true);
console.log('Token:', token);
const decoded = JSON.parse(atob(token.split('.')[1]));
console.log('Decoded:', decoded);
```

Should see:
```javascript
{
  role: 'admin',  // or 'super-admin'
  // ... other fields
}
```

## Need More Help?

See the comprehensive guide: [FIREBASE_RULES_GUIDE.md](./FIREBASE_RULES_GUIDE.md)
