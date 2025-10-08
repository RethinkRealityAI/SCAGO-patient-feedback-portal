# Firebase Console - Step-by-Step Authentication Setup

## Part 1: Enable Authentication (2 minutes)

### Step 1.1: Access Firebase Console
```
🔗 URL: https://console.firebase.google.com/
```

1. Open browser
2. Go to Firebase Console
3. You should see your project: **scago-feedback**
4. Click on it

### Step 1.2: Navigate to Authentication
```
Left Sidebar → Build → Authentication
```

**What you'll see:**
- If first time: A "Get started" button
- If previously accessed: Dashboard with tabs

### Step 1.3: Click "Get started"
- Large blue button in center of screen
- This initializes Authentication for your project

### Step 1.4: Enable Email/Password
```
Click: "Sign-in method" tab (top of page)
```

You'll see a list of sign-in providers:
- Email/Password ← Click this one
- Google
- Facebook
- etc.

**In the popup:**
1. Toggle ON: "Email/Password" (first toggle)
2. Leave OFF: "Email link (passwordless sign-in)" (optional)
3. Click: "Save" button

**Success indicator:**
- Email/Password status should show "Enabled" with green dot

---

## Part 2: Create Admin User (1 minute)

### Step 2.1: Go to Users Tab
```
Click: "Users" tab (next to "Sign-in method")
```

**What you'll see:**
- Empty list (or existing users)
- "Add user" button in top right

### Step 2.2: Click "Add user"

**In the form:**
```
Email: your-email@example.com
Password: [Choose a secure password]
```

**Important**: Write down this password! You'll need it to login.

### Step 2.3: Click "Add user"

**Success indicator:**
- User appears in list
- Shows: Email, UID, Created date, Last sign in

**Copy the UID**: You might need this later (optional)

---

## Part 3: Configure Admin Access in Firestore (2 minutes)

### Step 3.1: Navigate to Firestore Database
```
Left Sidebar → Build → Firestore Database
```

### Step 3.2: Go to Data Tab
```
Click: "Data" tab (if not already selected)
```

### Step 3.3: Create "config" Collection
```
Click: "Start collection" or "+ Start collection"
```

**In the form:**
```
Collection ID: config
```

Click: "Next"

### Step 3.4: Create "admins" Document
```
Document ID: admins
```

**Add Field:**
```
Field name: emails
Type: array (select from dropdown)
```

**Add Array Values:**
Click "+ Add item" for each admin email:
```
Item 0: your-email@example.com
Item 1: another-admin@example.com (optional)
```

### Step 3.5: Click "Save"

**Success indicator:**
- Document `config/admins` appears in Firestore
- Shows `emails` field with array icon

**Verify:**
- Click on the document to expand it
- Should see your email(s) in the array

---

## Part 4: Update Firestore Security Rules (1 minute)

### Step 4.1: Go to Rules Tab
```
Firestore Database → Click "Rules" tab
```

**What you'll see:**
- Text editor with current rules
- "Publish" button (top right)

### Step 4.2: Replace Rules

**Current rules** (should look similar to):
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

**Replace with** (copy from `docs/firestore-auth-rules.txt`):
```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isAdmin() {
      return isAuthenticated() && 
             get(/databases/$(database)/documents/config/admins).data.emails.hasAny([request.auth.token.email]);
    }
    
    match /surveys/{surveyId} {
      allow read: if true;
      allow create, update, delete: if isAdmin();
    }
    
    match /feedback/{feedbackId} {
      allow create: if true;
      allow read, update, delete: if isAdmin();
    }
    
    match /config/{docId} {
      allow read, write: if isAdmin();
    }
    
    match /backups/{backupId} {
      allow read, write: if isAdmin();
    }
  }
}
```

### Step 4.3: Click "Publish"

**Success indicator:**
- Green checkmark
- Message: "Rules published successfully"
- Timestamp updates

**Warning**: If you see errors, double-check the syntax

---

## Part 5: Authorize Domains (Production Only)

### Step 5.1: Go to Settings
```
Authentication → Settings tab → Authorized domains
```

**What you'll see:**
- List of authorized domains
- `localhost` is already there ✅

### Step 5.2: Add Your Production Domain

**If deploying to Netlify:**
```
Click: "Add domain"
Enter: your-app-name.netlify.app
Click: "Add"
```

**If you have a custom domain:**
```
Click: "Add domain"
Enter: yourdomain.com
Click: "Add"
```

**Success indicator:**
- Domain appears in list
- Status: Verified

---

## ✅ Verification Checklist

After completing all steps, verify:

### In Firebase Console:

**Authentication → Sign-in method:**
- [ ] Email/Password shows "Enabled" with green dot

**Authentication → Users:**
- [ ] At least one user exists (your admin account)
- [ ] Email matches what you'll use to login

**Firestore Database → Data:**
- [ ] `config` collection exists
- [ ] `config/admins` document exists
- [ ] `emails` field is an array
- [ ] Your admin email is in the array

**Firestore Database → Rules:**
- [ ] Rules published successfully
- [ ] Includes `isAdmin()` function
- [ ] Includes `config/admins` check

**Authentication → Settings → Authorized domains:**
- [ ] `localhost` is present
- [ ] Production domain added (if deploying)

### In Your App:

**Before testing, make sure:**
- [ ] Code changes committed
- [ ] `npm run dev` is running
- [ ] No build errors

**Test flow:**
1. [ ] Go to `http://localhost:9002/dashboard`
2. [ ] Gets redirected to `/login`
3. [ ] Can see login form with email/password fields
4. [ ] Enter admin credentials
5. [ ] Successfully logs in
6. [ ] Redirected to dashboard
7. [ ] Dashboard loads without errors

---

## 🎯 Common Issues & Solutions

### Issue: "Email/Password" option is grayed out
**Solution**: You might not have permission. Check if you're the project owner.

### Issue: Can't create user - "Operation not allowed"
**Solution**: Email/Password auth might not be saved. Re-enable and click Save.

### Issue: Created user but can't find UID
**Solution**: 
1. Go to Authentication → Users
2. Click on the user's email
3. UID is at the top of the details panel

### Issue: Firestore rules won't publish
**Solution**: 
- Check for syntax errors (red underlines)
- Make sure all brackets match
- Copy the rules exactly from the provided file

### Issue: "emails.hasAny is not a function"
**Solution**: Make sure the `emails` field in Firestore is type `array`, not `string`

### Issue: User logs in but gets "Access Denied"
**Solution**: 
1. Check Firestore `config/admins` document
2. Verify email matches exactly (case-sensitive)
3. Make sure email is in the `emails` array field

---

## 📸 Visual Checklist

Here's what success looks like:

### Firebase Authentication Dashboard:
```
✅ Email/Password: Enabled (green dot)
✅ Users: 1 user minimum
✅ Provider: Email/Password
```

### Firestore Data View:
```
📁 config
  └─ 📄 admins
      └─ 🔢 emails: ["your-email@example.com"]
```

### Firestore Rules:
```
✅ Published: [timestamp]
✅ Contains: isAdmin() function
✅ Contains: get(/databases/.../config/admins)
```

---

## ⏱️ Time Estimate

- **Enable Auth**: 1 minute
- **Create User**: 1 minute
- **Configure Firestore**: 2 minutes
- **Update Rules**: 1 minute
- **Test**: 1 minute

**Total**: ~5-6 minutes

---

## 🎊 You're Done!

Once all checkboxes are checked, your Firebase Authentication is fully configured!

**Next**: Test the login in your app

**Then**: Deploy to production with confidence 🚀

