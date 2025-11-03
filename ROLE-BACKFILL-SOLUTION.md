# Role Backfill Solution - Fixing "No Role Assigned" Login Errors

## Problem

Existing users are getting "No role assigned to this account" errors when trying to sign in, even though:
- Their role appears in the User Management panel
- They can't update/change their role in the UI

## Root Cause

When we migrated to using Firebase Auth custom claims as the single source of truth for roles:

1. **Old users** created before the migration don't have custom claims set in Firebase Auth
2. The **User Management UI** shows a default role (`participant`) if no custom claim exists, but this is just for display
3. When users try to **log in**, the `getUserRole()` function reads from actual Firebase Auth custom claims, which are missing
4. This causes the "No role assigned" error

## Solution: Role Backfill Script

I've created a one-time backfill script that:
- Finds all users in Firebase Auth without custom claims
- Checks Firestore (`yep_participants` and `yep_mentors` collections) to determine their role
- Sets the appropriate custom claim based on which collection their email appears in
- Defaults to `participant` if no Firestore match is found

### How to Run the Backfill

1. **Via Admin Panel UI** (Recommended):
   - Go to `/admin` → Users tab
   - Click the **"Sync Roles (Backfill)"** button in the top right
   - Confirm the action
   - Wait for completion (check toast notification and browser console for details)

2. **Or call the server action directly**:
   ```typescript
   import { backfillRoleClaims } from '@/app/admin/backfill-role-claims';
   const result = await backfillRoleClaims();
   ```

### What the Backfill Does

1. Fetches all users from Firebase Auth (up to 1000)
2. For each user without a role custom claim:
   - Checks if email exists in `yep_mentors` collection → sets role to `mentor`
   - Checks if email exists in `yep_participants` collection → sets role to `participant`
   - If no match found → defaults to `participant`
3. Sets the custom claim using `auth.setCustomUserClaims()`
4. Returns a summary with counts of roles set

### After Running Backfill

**Important**: Users whose roles were just set need to:
1. **Sign out** completely
2. **Sign back in** to get a new ID token with the updated custom claims

The backfill sets the claims on the server side, but users must refresh their token to see the changes. This is normal Firebase Auth behavior.

## Fixing Individual Users

If you need to fix a specific user's role:

1. **Set role via User Management**:
   - Go to `/admin` → Users tab
   - Click on the user
   - Change their role in the dropdown
   - Click "Save"
   
2. **User must then**:
   - Sign out
   - Sign back in

## Verification

After running the backfill:

1. Check the toast notification for summary counts
2. Check browser console for detailed logs
3. Verify in User Management that roles are showing correctly
4. Have affected users sign out and back in to test

## Technical Details

### Files Created/Modified

1. **`src/app/admin/backfill-role-claims.ts`** (NEW)
   - Server action to backfill roles from Firestore to Firebase Auth custom claims
   - Only accessible by super-admin

2. **`src/components/admin/enhanced-user-management.tsx`** (MODIFIED)
   - Added "Sync Roles (Backfill)" button in the Users tab header
   - Triggers the backfill function with confirmation

### Role Resolution Logic

The backfill uses this priority:
1. Existing custom claim (if already set, skip)
2. Email match in `yep_mentors` → `mentor`
3. Email match in `yep_participants` → `participant`
4. No match → `participant` (default)

### Why Token Refresh is Needed

Firebase Auth custom claims are included in the ID token. When custom claims are updated:
- The change is immediate on the server side
- But the user's current ID token still has the old (or missing) claims
- The user must get a new token (by signing out/in or waiting for token refresh) to see the new claims

The login form does call `getIdToken(true)` to force refresh, but if the user is already logged in with an old token, they won't see the update until they sign out and back in.

## Prevention

Going forward:
- New users created via the admin panel automatically get custom claims set
- YEP invites automatically set custom claims when creating users
- All new user creation paths now include custom claim assignment

This backfill is a one-time migration to fix existing users.

