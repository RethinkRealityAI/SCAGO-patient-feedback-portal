# Firebase Security Rules Guide

## Overview

This guide explains how Firebase Security Rules are configured for the SCAGO Patient Feedback Portal, specifically for the Youth Empowerment Program (YEP) features.

## Architecture

The system uses **Custom Claims** stored in Firebase Auth tokens to determine user roles and permissions. This ensures consistent admin checking across both Firestore and Storage.

### User Roles

1. **admin** or **super-admin** - Full access to all features
2. **yep-manager** - Full access to YEP features only
3. **Regular users** - Participants and Mentors (no special role)

## Admin Role Assignment

Admin roles are set using Firebase custom claims in the user's authentication token. The token contains a `role` field:

```javascript
{
  "role": "admin"  // or "super-admin" or "yep-manager"
}
```

### How to Set Admin Custom Claims

Using Firebase Admin SDK (server-side):

```javascript
const admin = require('firebase-admin');

// Set user as admin
await admin.auth().setCustomUserClaims(userId, { role: 'admin' });

// Set user as YEP manager
await admin.auth().setCustomUserClaims(userId, { role: 'yep-manager' });
```

**Important:** After setting custom claims, users must:
1. Sign out and sign back in, OR
2. Force refresh their token using `user.getIdToken(true)`

## Firestore Rules

### Admin Check Function
```javascript
function isAdmin() {
  return isAuthenticated() &&
         (request.auth.token.role == 'admin' ||
          request.auth.token.role == 'super-admin');
}
```

### YEP Participants Collection

**Admin/YEP Manager Access:**
- Full read/write access to all participant documents

**Participant Self Access:**
- Can read their own profile (matched by `userId` or `authEmail`)
- Can update limited fields:
  - Contact info (phone, emergency contact)
  - Address fields
  - Availability and notes
  - Document upload fields
  - Profile completion status

### YEP Mentors Collection

Same pattern as participants:
- Admins/YEP Managers: Full access
- Mentors: Read own profile, update limited fields

## Storage Rules

### Admin Check Function
```javascript
function isAdmin() {
  return isAuthenticated() &&
         (request.auth.token.role == 'admin' ||
          request.auth.token.role == 'super-admin');
}
```

### File Paths Structure

#### Structured Paths (Recommended)
```
yep-files/
  ├── participants/
  │   └── {participantId}/
  │       ├── contract.pdf
  │       ├── id-card.jpg
  │       └── ...
  └── mentors/
      └── {mentorId}/
          ├── police-check.pdf
          ├── resume.pdf
          └── ...
```

**Access:**
- Admins/YEP Managers: Full access
- Participant/Mentor: Only their own folder (matched by participant/mentor ID)

#### Legacy Path (Backwards Compatible)
```
yep-files/
  └── {timestamp}-{filename}
```

**Access:**
- **Admin/YEP Manager only** - Used when admins upload files while creating/editing profiles

### Other Storage Paths

1. **survey-files/** - Public read, admin write
2. **feedback-files/** - Admin read, authenticated write
3. **profile-images/{userId}/** - Public read, owner write
4. **temp/** - Authenticated read/write, admin delete

## Deployment

### Option 1: Using the Deployment Script
```bash
cd docs
./deploy-rules.sh
```

### Option 2: Manual Deployment
```bash
# Deploy Firestore rules only
firebase deploy --only firestore:rules

# Deploy Storage rules only
firebase deploy --only storage:rules

# Deploy both
firebase deploy --only firestore:rules,storage:rules
```

## Troubleshooting

### 403 Forbidden Errors

**Symptom:** Getting 403 errors when uploading files as admin

**Causes:**
1. Custom claims not set on user account
2. User hasn't refreshed their token after claims were set
3. Storage rules not deployed to Firebase

**Solutions:**
1. Verify custom claims are set:
   ```javascript
   // In browser console
   const token = await firebase.auth().currentUser.getIdToken(true);
   const decoded = JSON.parse(atob(token.split('.')[1]));
   console.log('Role:', decoded.role);
   ```

2. Force token refresh:
   ```javascript
   await firebase.auth().currentUser.getIdToken(true);
   window.location.reload();
   ```

3. Deploy rules:
   ```bash
   firebase deploy --only storage:rules
   ```

### Admin Check Not Working

**Check these items:**
1. Custom claims are set correctly
2. User has signed out and back in
3. Rules are deployed to Firebase
4. Token contains the role field

### File Upload Path Issues

**Issue:** Files uploading to wrong path

**Solution:**
- For admin uploads: `yep-files/{filename}` works
- For user uploads: `yep-files/participants/{id}/{filename}` required

## Security Best Practices

1. **Never bypass security rules** - Even for admin users
2. **Use structured paths** - Helps with organization and access control
3. **Validate file types** - Add client-side validation before upload
4. **Limit file sizes** - Use client-side checks (max 10MB recommended)
5. **Audit regularly** - Review who has admin access
6. **Test permissions** - Test with different user roles before deploying

## Testing Rules

### Local Testing
```bash
firebase emulators:start --only firestore,storage
```

Then run tests against the emulator.

### Production Testing Checklist

Test as different user types:
- [ ] Admin can upload to participant profiles
- [ ] Admin can read all files
- [ ] Participant can upload to own profile
- [ ] Participant cannot access other profiles
- [ ] Mentor can upload to own profile
- [ ] Mentor cannot access participant files
- [ ] Anonymous users cannot access YEP files

## Additional Resources

- [Firebase Custom Claims Documentation](https://firebase.google.com/docs/auth/admin/custom-claims)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Storage Security Rules](https://firebase.google.com/docs/storage/security/start)
