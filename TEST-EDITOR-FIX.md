# Testing Guide: Editor Permission Fix

## Quick Test (5 minutes)

### Step 1: Verify You're an Admin
1. Open Firestore Console: https://console.firebase.google.com/project/scago-feedback/firestore/data
2. Navigate to `config` → `admins`
3. Check that your email is in the `emails` array
4. **Important:** Email must match EXACTLY with your login email

### Step 2: Refresh Authentication
If you just added yourself to admins or haven't logged in recently:
1. Logout of the application
2. Clear browser cookies (or use incognito mode)
3. Login again
4. This refreshes your authentication token with updated admin claims

### Step 3: Open Browser Console
1. Press `F12` or right-click → Inspect
2. Go to the "Console" tab
3. Keep this open to see authentication logs

### Step 4: Test Survey Creation
1. Go to `/editor`
2. Click "New Survey" dropdown
3. Select any template (e.g., "✨ Blank Survey")
4. **Look for in console:**
   ```
   [createBlankSurvey] Authenticated as: your-email@example.com
   ```
5. **Success:** Survey editor opens with new survey
6. **Failure:** Error toast appears with specific message

### Step 5: Test Survey Editing
1. In the survey editor, make a small change (e.g., edit survey title)
2. Click "Save Survey" button at top
3. **Look for in console:**
   ```
   [updateSurvey] Authenticated as: your-email@example.com
   Form submitted with values: {...}
   Update result: {}
   ```
4. **Success:** "Survey Saved" toast appears
5. **Failure:** "Save Failed" toast with error message

## Expected Console Output (Success)

```
[createBlankSurvey] Authenticated as: admin@example.com
Form submitted with values: {...}
[updateSurvey] Authenticated as: admin@example.com
[updateSurvey] Payload size (bytes): 19680
Update result: {}
```

## Expected Console Output (Permission Error)

```
[createBlankSurvey] Authenticated as: user@example.com
Error creating blank survey: FirebaseError: 7 PERMISSION_DENIED
Current user: user@example.com
```

**If you see this:** Your email (user@example.com) is NOT in the Firestore `config/admins` document. Add it there.

## Expected Console Output (Not Authenticated)

```
[createBlankSurvey] No authenticated user found
```

**If you see this:** 
1. You're not logged in
2. Authentication failed
3. Try logging out and back in
4. Check Firebase Auth console for your user

## Troubleshooting

### Error: "You must be logged in to create surveys"
**Cause:** Not authenticated  
**Fix:**
1. Check if you're on the login page
2. Login with your credentials
3. If already logged in, try logging out and back in

### Error: "Permission denied. Your email (...) must be listed in Firestore config/admins document"
**Cause:** Your email is not in the admins list  
**Fix:**
1. Go to Firestore Console
2. Open `config/admins` document
3. Add your email to the `emails` array
4. Logout and login again to refresh token

### Error: "Missing or insufficient permissions" (old error format)
**Cause:** Fix didn't apply correctly  
**Fix:**
1. Stop the dev server (`Ctrl+C`)
2. Clear Next.js cache: `rm -rf .next` (or delete `.next` folder)
3. Restart: `npm run dev`
4. Hard refresh browser (`Ctrl+Shift+R` or `Cmd+Shift+R`)

### Console Shows "Authenticated as: X" but Still Permission Error
**Cause:** Firestore rules not deployed or email not in admins  
**Fix:**
1. Verify Firestore rules are published
2. Verify email is EXACTLY the same (case-sensitive)
3. Try logging out and back in
4. Check browser's Application tab → IndexedDB → firebaseLocalStorage for auth data

## Verification Commands

### Check if user is authenticated (browser console)
```javascript
firebase.auth().currentUser?.email
```

### Check if using client actions (look in Network tab)
- ✅ Should NOT see requests to `/editor` POST endpoint
- ✅ Should see Firestore REST API calls to `firestore.googleapis.com`
- ✅ Should see `Authorization: Bearer ...` headers in Firestore requests

## Success Criteria

✅ Can create new surveys without errors  
✅ Can edit and save surveys without errors  
✅ Console shows authentication logs  
✅ Error messages are clear and actionable  
✅ Toast notifications appear for success/failure  

## If Still Broken

**Gather this information:**
1. Screenshot of browser console (with any errors)
2. Screenshot of Firestore `config/admins` document
3. Email you're logged in with (from console log)
4. Exact error message from toast notification

**Then:**
- Check the `EDITOR-PERMISSION-FIX.md` for detailed technical explanation
- Verify all changes were applied correctly
- Check if Next.js dev server restarted after changes

