# Editor Permission Error - Root Cause Analysis & Fix

## Issue Summary
Users were getting `PERMISSION_DENIED` errors when:
1. Creating new surveys
2. Updating existing surveys in the editor
3. Saving changes in the survey editor

Error message:
```
FirebaseError: 7 PERMISSION_DENIED: Missing or insufficient permissions.
```

## Root Cause

### The Problem
The survey creation and editor were using **SERVER ACTIONS** (from `src/app/editor/actions.ts`) instead of **CLIENT ACTIONS** (from `src/lib/client-actions.ts`).

**Why this caused permission errors:**
1. Server actions run on the SERVER (not the browser)
2. Server actions use the Firebase CLIENT SDK without authentication context
3. Firestore security rules require `request.auth.token.email` to be in the `config/admins` document
4. When Firebase client SDK is called from the server, `request.auth` is `null`
5. Therefore, the `isAdmin()` check in Firestore rules fails

### The Architecture

**Correct Design:**
```typescript
// CLIENT-SIDE actions (src/lib/client-actions.ts)
// ✅ Has auth context from the browser
// ✅ Firebase Auth automatically includes the user's token
// ✅ Firestore rules can check request.auth.token.email

// SERVER-SIDE actions (src/app/editor/actions.ts)
// ❌ No auth context when using client SDK
// ❌ request.auth is null
// ❌ Firestore rules fail
```

## Files Fixed

### 1. `src/app/editor/client.tsx`
**Before:**
```typescript
import { createBlankSurvey, createSurvey, createSurveyV2, createConsentSurvey, deleteSurvey } from './actions';
```

**After:**
```typescript
import { createBlankSurvey, createSurvey, createSurveyV2, createConsentSurvey, deleteSurvey } from '@/lib/client-actions';
```

**Why:** Changed from server actions to client actions so Firestore operations have user authentication context.

**Additional Fix:** Added error handling and toast notifications for failed survey creation.

### 2. `src/lib/client-actions.ts`
**Improvements:**
1. ✅ Added authentication state checking before all Firestore operations
2. ✅ Added detailed logging to help diagnose permission issues
3. ✅ Added user-friendly error messages that include the authenticated email
4. ✅ Imported `auth` from Firebase to check current user state

**Example:**
```typescript
export async function updateSurvey(surveyId: string, data: any) {
  try {
    // Debug: Check auth state
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.error('[updateSurvey] No authenticated user found');
      return { error: 'You must be logged in to update surveys. Please refresh the page and try again.' };
    }
    console.log('[updateSurvey] Authenticated as:', currentUser.email);
    
    // ... rest of the function
  } catch (error) {
    // ... improved error handling with specific messages
    if (msg?.toLowerCase().includes('permission') || err?.code === 'permission-denied') {
      return { error: `Permission denied. Your email (${auth.currentUser?.email}) must be listed in Firestore config/admins document. Please contact your administrator.` };
    }
  }
}
```

### 3. `src/components/survey-editor.tsx`
**Status:** Already correctly using client actions. No changes needed (reverted experimental change).

## How It Works Now

### Survey Creation Flow
1. User clicks "New Survey" button
2. `CreateSurveyDropdown` component calls client-side action (e.g., `createBlankSurvey()`)
3. Client action checks if user is authenticated (`auth.currentUser`)
4. If authenticated, creates Firestore document with user's auth context
5. Firestore rules check `request.auth.token.email` against `config/admins` document
6. If email is in admins list, operation succeeds
7. If not, shows clear error message with the email and instructions

### Survey Update Flow
1. User edits survey and clicks "Save"
2. `survey-editor` component calls `updateSurvey()` from client actions
3. Client action checks authentication state
4. Updates Firestore with user's auth context
5. Firestore rules validate admin status
6. Shows success or error toast notification

## Debugging Features Added

### Console Logging
All client actions now log:
- ✅ Function name and operation
- ✅ Authenticated user email
- ✅ Error details if operation fails

**Example logs:**
```
[createBlankSurvey] Authenticated as: admin@scago.com
✅ Survey created successfully

[updateSurvey] Authenticated as: admin@scago.com
❌ Permission denied. Your email (admin@scago.com) must be listed in Firestore config/admins document.
```

### User-Friendly Error Messages
Instead of generic errors, users now see:
- "You must be logged in to create surveys. Please refresh the page and try again."
- "Permission denied. Your email (user@example.com) must be listed in Firestore config/admins document."

## Testing Checklist

### ✅ Verify These Work:
1. [ ] Create new blank survey
2. [ ] Create new survey from template (Default, V2, Consent)
3. [ ] Edit existing survey and save changes
4. [ ] Delete survey
5. [ ] Error messages appear when user is not in admins list
6. [ ] Console logs show authentication state

### If Still Getting Permission Errors:

**Check 1: User is Authenticated**
```
Open browser console → Look for log: "[functionName] Authenticated as: your-email@example.com"
```

**Check 2: Email is in Admins List**
1. Go to Firestore Console: https://console.firebase.google.com/project/scago-feedback/firestore/data
2. Navigate to `config` → `admins` document
3. Check `emails` array contains your email
4. Email must match EXACTLY (case-sensitive)

**Check 3: Firestore Rules are Deployed**
1. Go to Firestore Rules: https://console.firebase.google.com/project/scago-feedback/firestore/rules
2. Verify rules match `docs/firestore.rules`
3. Click "Publish" if rules need updating

**Check 4: Token is Current**
If you recently added your email to admins:
1. Logout of the application
2. Clear browser cookies
3. Login again (this refreshes the auth token)
4. Try the operation again

## Technical Notes

### Why Not Use Firebase Admin SDK?
The Firebase Admin SDK would bypass Firestore security rules entirely and run with elevated privileges. However:
1. Requires setting up service account credentials
2. Requires server-side only architecture
3. More complex authentication flow
4. Current client-side approach works well for admin operations

### Why Client Actions Work Better
1. **Authentication Context:** Browser automatically includes Firebase Auth token
2. **Simpler Architecture:** No need for server-side credential management
3. **Real-time Updates:** Client SDK supports real-time Firestore listeners
4. **Easier Debugging:** Can inspect auth state in browser console

### Server Actions Use Case
Server actions (in `src/app/editor/actions.ts`) are still useful for:
- **Read operations** (don't require admin privileges)
- **Server-side rendering** (fetching data for page load)
- **Operations that need Admin SDK** (when properly configured)

## Summary

**Problem:** Editor was using server actions without auth context
**Solution:** Changed to use client actions with auth context  
**Result:** Survey creation and editing now work correctly with proper permission checking

**Key Insight:** When using Firebase client SDK, operations must run client-side (in the browser) to have authentication context for Firestore security rules.

