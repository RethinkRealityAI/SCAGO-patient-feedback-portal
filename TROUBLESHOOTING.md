# 🔧 Troubleshooting Guide

## Common Issues & Solutions

### ❌ Error: Missing Firebase environment variables

**Error Message:**
```
Error: Missing Firebase environment variables: ["NEXT_PUBLIC_FIREBASE_API_KEY",...]
```

**Cause:** Next.js dev server didn't load `.env.local` file

**Solution:**
```bash
# 1. Stop the dev server (Ctrl+C)
# 2. Kill all node processes
taskkill /F /IM node.exe

# 3. Restart dev server
npm run dev
```

**Verify:**
```bash
# Check .env.local exists and has content
cat .env.local
# or
Get-Content .env.local
```

---

### ❌ OneDrive Sync Errors (ENOENT errors)

**Error Message:**
```
[Error: ENOENT: no such file or directory, open '...\.next\...\file.tmp.xxx']
```

**Cause:** OneDrive is syncing the `.next` folder, causing file locks

**Solution:**
```bash
# 1. Stop dev server
# 2. Delete .next folder
Remove-Item -Recurse -Force .next

# 3. Add .next to OneDrive exclusions (optional)
# Right-click OneDrive icon → Settings → Backup → Manage backup
# Exclude .next folder

# 4. Restart dev server
npm run dev
```

**Prevention:**
- Add `.next` to `.gitignore` (already done ✅)
- Consider moving project outside OneDrive
- Or exclude `.next` folder from OneDrive sync

---

### ❌ Admin Panel: Internal Error

**Error:** Admin page shows internal error or blank

**Solutions:**

1. **Check Authentication:**
   ```
   - Are you logged in?
   - Is your email in config/admins?
   - Try logging out and back in
   ```

2. **Check Firestore:**
   ```
   - Does config/admins document exist?
   - Is emails field an array?
   - Is your email in the array?
   ```

3. **Check Browser Console:**
   ```
   - Open DevTools (F12)
   - Look for red errors
   - Check Network tab for failed requests
   ```

4. **Clear Cache:**
   ```bash
   # Stop server, clear .next, restart
   taskkill /F /IM node.exe
   Remove-Item -Recurse -Force .next
   npm run dev
   ```

---

### ❌ Cannot Access Admin Panel (Redirected to /unauthorized)

**Cause:** Your email is not in the admin list

**Solution:**
```
1. Go to Firestore Console
2. Navigate to: config/admins
3. Check emails array includes your email
4. Add your email if missing
5. Logout and login again
```

**Verify in Firestore:**
```
Collection: config
Document: admins
Field: emails (array)
Value: ["your-email@example.com"]
```

---

### ❌ Users Tab Shows No Users

**Cause:** Users are tracked after they login

**Solution:**
```
1. Login as admin (creates first entry)
2. Add more users in Firebase Console
3. Have them login (tracked automatically)
4. Refresh admin panel
```

**Note:** Historical logins before implementation are not tracked

---

### ❌ Activity Log Empty

**Cause:** Activity logging starts after implementation

**Solution:**
```
1. Perform actions (login, create user, etc.)
2. Wait a few seconds
3. Refresh Activity Log tab
4. Check userActivity collection in Firestore
```

---

### ❌ Health Check Shows "Unhealthy"

**Possible Causes:**
- Database connection issues
- Missing environment variables
- Firebase service outage

**Solutions:**

1. **Check Environment Variables:**
   ```bash
   Get-Content .env.local
   # Verify all NEXT_PUBLIC_FIREBASE_* variables are set
   ```

2. **Check Firebase Console:**
   ```
   - Go to Firebase Console
   - Check for service issues
   - Verify project is active
   ```

3. **Test Database Connection:**
   ```
   - Try accessing Dashboard
   - Check if surveys load
   - Verify Firestore is accessible
   ```

4. **Check API Endpoint:**
   ```
   curl http://localhost:9002/api/health
   # Should return JSON with status
   ```

---

### ❌ Build Errors

**Error:** `npm run build` fails

**Common Solutions:**

1. **TypeScript Errors:**
   ```bash
   # Check for type errors
   npm run typecheck
   
   # Temporarily ignore (not recommended)
   # Already configured in next.config.ts
   ```

2. **Dependency Issues:**
   ```bash
   # Clear and reinstall
   Remove-Item -Recurse -Force node_modules
   Remove-Item package-lock.json
   npm install
   ```

3. **Cache Issues:**
   ```bash
   # Clear Next.js cache
   Remove-Item -Recurse -Force .next
   npm run build
   ```

---

### ❌ Cannot Create Users in Firebase Console

**Problem:** "Add user" button doesn't work

**Solution:**
```
1. Check you have Owner/Editor role in Firebase
2. Verify Email/Password auth is enabled
3. Try different browser
4. Check Firebase Console status
```

**Alternative:**
```
Use Firebase CLI:
firebase auth:import users.json --project scago-feedback
```

---

### ❌ Login Tracking Not Working

**Problem:** Last login not updating

**Solution:**

1. **Check Implementation:**
   ```
   - Verify auth-provider.tsx has trackUserLogin
   - Check browser console for errors
   - Verify users collection exists in Firestore
   ```

2. **Check Firestore Permissions:**
   ```javascript
   // In Firestore Rules
   match /users/{userId} {
     allow write: if true; // System can write
   }
   ```

3. **Test Manually:**
   ```
   - Logout completely
   - Clear browser cache
   - Login again
   - Check Firestore users collection
   ```

---

### ❌ Rate Limiting Blocking Submissions

**Error:** "Too many submissions"

**Solution:**

1. **Check Rate Limit:**
   ```typescript
   // In src/lib/rate-limiter.ts
   // Default: 10 submissions per minute
   ```

2. **Adjust if Needed:**
   ```typescript
   checkRateLimit(identifier, {
     maxRequests: 20, // Increase limit
     windowMs: 60000,
   });
   ```

3. **Clear Rate Limit:**
   ```
   Wait 1 minute
   or restart server (clears in-memory cache)
   ```

---

## 🆘 Quick Fixes

### Complete Reset
```bash
# Nuclear option - fixes most issues
taskkill /F /IM node.exe
Remove-Item -Recurse -Force .next
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install
npm run dev
```

### Quick Restart
```bash
# Simple restart
taskkill /F /IM node.exe
npm run dev
```

### Clear Browser Cache
```
1. Open DevTools (F12)
2. Right-click refresh button
3. Select "Empty Cache and Hard Reload"
or
4. Ctrl+Shift+Delete → Clear browsing data
```

---

## 📞 Still Having Issues?

### Debugging Steps

1. **Check Logs:**
   ```
   - Terminal output
   - Browser console (F12)
   - Network tab in DevTools
   ```

2. **Verify Configuration:**
   ```
   - .env.local file exists
   - Firebase Console settings
   - Firestore security rules
   ```

3. **Test Components:**
   ```
   - Can you access /login?
   - Can you access /dashboard?
   - Can you access /admin?
   ```

4. **Check Firebase:**
   ```
   - Authentication enabled?
   - User accounts created?
   - Firestore rules published?
   ```

### Get Help

1. Check documentation:
   - FIREBASE-AUTH-QUICKSTART.md
   - ADMIN-PANEL-GUIDE.md
   - ENHANCED-USER-MANAGEMENT-COMPLETE.md

2. Review implementation:
   - Check recent git commits
   - Compare with working examples
   - Review error messages carefully

3. Firebase resources:
   - https://firebase.google.com/docs
   - Firebase Status: https://status.firebase.google.com
   - Stack Overflow: tag `firebase`

---

**Last Updated:** October 1, 2025  
**Version:** 1.0

