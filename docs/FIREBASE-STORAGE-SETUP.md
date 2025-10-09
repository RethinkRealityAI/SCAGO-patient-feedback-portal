# Firebase Storage Setup Guide

This guide will help you configure Firebase Storage to fix the CORS errors when creating participants with file uploads.

## 🚨 Current Issue

You're seeing these errors:
- `Failed to load resource: net::ERR_FAILED` for Firebase Storage files
- `Access to XMLHttpRequest... blocked by CORS policy` for Firebase Storage requests

## 🔧 Solution: Configure Firebase Storage Rules

### Step 1: Go to Firebase Console

1. Open [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `scago-feedback`
3. Go to **Storage** in the left sidebar

### Step 2: Enable Firebase Storage (if not already enabled)

1. Click **"Get started"** if Storage is not enabled
2. Choose **"Start in test mode"** for now (we'll add proper rules)
3. Select a location for your storage bucket (choose closest to your users)
4. Click **"Done"**

### Step 3: Configure Storage Rules

1. Go to **Storage** → **Rules** tab
2. Replace the default rules with the following:

```javascript
rules_version = '2';

// Firebase Storage Security Rules
service firebase.storage {
  match /b/{bucket}/o {
    
    // Helper function to check if user is authenticated
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Helper function to check if user is admin
    function isAdmin() {
      return isAuthenticated() && 
             exists(/databases/(default)/documents/config/admins) &&
             get(/databases/(default)/documents/config/admins).data.emails.hasAny([request.auth.token.email]);
    }
    
    // Helper function to check if user is YEP Manager
    function isYEPManager() {
      return isAuthenticated() && 
             exists(/databases/(default)/documents/config/yep_managers) &&
             get(/databases/(default)/documents/config/yep_managers).data.emails.hasAny([request.auth.token.email]);
    }
    
    // Helper function to check if user is admin or YEP Manager
    function isAdminOrYEPManager() {
      return isAdmin() || isYEPManager();
    }
    
    // YEP Files - Admin or YEP Manager can read/write
    match /yep-files/{allPaths=**} {
      allow read, write: if isAdminOrYEPManager();
    }
    
    // Survey Files - Admin can read/write, public can read
    match /survey-files/{allPaths=**} {
      allow read: if true;  // Public read access for survey files
      allow write: if isAdmin();  // Only admins can upload survey files
    }
    
    // Feedback Files - Anyone can upload, admin can read/delete
    match /feedback-files/{allPaths=**} {
      allow read, write: if isAdmin();  // Admin can read/delete
      allow write: if true;  // Anyone can upload feedback files
    }
    
    // Profile Images - Authenticated users can read/write their own
    match /profile-images/{userId}/{allPaths=**} {
      allow read: if true;  // Public read access
      allow write: if isAuthenticated() && request.auth.uid == userId;
    }
    
    // Temporary uploads - Authenticated users can write, admin can read/delete
    match /temp/{allPaths=**} {
      allow read, write: if isAuthenticated();
      allow delete: if isAdmin();
    }
  }
}
```

3. Click **"Publish"**

### Step 4: Verify Storage Configuration

1. Go to **Storage** → **Files** tab
2. You should see an empty storage bucket
3. The bucket URL should be something like: `gs://scago-feedback.appspot.com`

### Step 5: Test File Upload

1. Go to your application
2. Try creating a participant with a file upload
3. The CORS errors should be resolved

## 🔍 Troubleshooting

### If you still see CORS errors:

1. **Check Firebase Storage is enabled**: Go to Storage → Files tab
2. **Verify rules are published**: Go to Storage → Rules tab, should show "Published"
3. **Check browser console**: Look for specific error messages
4. **Clear browser cache**: Hard refresh (Ctrl+F5)

### If you see authentication errors:

1. **Check Firestore rules**: Make sure `config/admins` document exists
2. **Verify user is logged in**: Check Authentication → Users tab
3. **Check admin email**: Ensure your email is in the `config/admins` document

### If file uploads fail:

1. **Check file size**: Default limit is 32MB
2. **Check file type**: Ensure file type is allowed
3. **Check network**: Ensure stable internet connection

## 📁 File Organization

The storage rules organize files as follows:

- **`yep-files/`** - YEP participant files (secure, admin/YEP manager only)
- **`survey-files/`** - Survey-related files (public read, admin write)
- **`feedback-files/`** - Feedback submission files (anyone upload, admin manage)
- **`profile-images/`** - User profile images (public read, user write)
- **`temp/`** - Temporary files (authenticated users)

## 🔒 Security Notes

- YEP files are protected and only accessible by admins and YEP managers
- Survey files are publicly readable but only admins can upload
- Feedback files can be uploaded by anyone but only admins can manage them
- Profile images are publicly readable but users can only upload their own

## ✅ Success Indicators

After completing this setup:

1. **No CORS errors** in browser console
2. **File uploads work** when creating participants
3. **Files appear** in Firebase Storage → Files tab
4. **Download URLs work** for uploaded files

## 🚀 Next Steps

1. Test participant creation with file upload
2. Verify files appear in Firebase Storage
3. Test file downloads work correctly
4. Consider setting up file cleanup policies for temporary files

---

**Need help?** Check the Firebase Console for any error messages or contact support.
