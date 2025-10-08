# Firebase Authentication Setup Guide

## Step 1: Enable Authentication in Firebase Console

### 1.1 Access Firebase Console
1. Go to https://console.firebase.google.com/
2. Select your project: **scago-feedback**

### 1.2 Enable Email/Password Authentication
1. In the left sidebar, click **"Build"** → **"Authentication"**
2. Click **"Get started"** (if this is your first time)
3. Go to the **"Sign-in method"** tab
4. Click on **"Email/Password"**
5. Enable the first toggle: **"Email/Password"**
6. (Optional) Enable **"Email link (passwordless sign-in)"** if you want passwordless login
7. Click **"Save"**

### 1.3 Add Authorized Domains
1. Still in **"Authentication"** → **"Settings"** → **"Authorized domains"**
2. Add your production domain(s):
   - Your Netlify domain (e.g., `your-app.netlify.app`)
   - Your custom domain (if any)
3. `localhost` is already authorized for development

### 1.4 Create Admin User
1. Go to **"Authentication"** → **"Users"** tab
2. Click **"Add user"**
3. Enter email: `admin@scago.com` (or your preferred admin email)
4. Enter password: Choose a secure password
5. Click **"Add user"**
6. **Important**: Save this user's UID - you'll need it for admin privileges

## Step 2: Set Custom Claims for Admin (Optional but Recommended)

To give admin privileges, you need to use Firebase Admin SDK or Firebase CLI:

### Option A: Using Firebase CLI (Easiest)

1. Install Firebase CLI (if not already):
   ```bash
   npm install -g firebase-tools
   ```

2. Login to Firebase:
   ```bash
   firebase login
   ```

3. Create a script to set admin claim:
   ```bash
   # In your project root
   firebase functions:shell
   ```

### Option B: Using Firebase Console (Manual)

For now, we'll use Firestore to store admin emails and check against that list.

## Step 3: Update Firestore Security Rules

1. Go to **"Firestore Database"** → **"Rules"**
2. Replace with the rules from `docs/firestore-auth-rules.txt`
3. Click **"Publish"**

## Step 4: Implementation (Already Done for You!)

The implementation files have been created:
- ✅ `src/lib/firebase-auth.ts` - Auth functions
- ✅ `src/components/auth/login-form.tsx` - Login UI
- ✅ `src/components/auth/auth-provider.tsx` - Auth context
- ✅ `src/hooks/use-auth.ts` - Auth hook
- ✅ Updated Firestore rules

## Step 5: Configure Admin Users

### Add Admin Emails to Firestore

1. Go to **Firestore Database** → **Data** tab
2. Create a new collection: `config`
3. Create a document with ID: `admins`
4. Add fields:
   ```
   emails (array):
     - admin@scago.com
     - youremail@example.com
   ```

OR use the admin panel that will be created at `/admin/setup`

## Step 6: Test the Implementation

1. **Start your dev server**:
   ```bash
   npm run dev
   ```

2. **Try to access dashboard**:
   - Go to `http://localhost:9002/dashboard`
   - Should redirect to `/login`

3. **Login**:
   - Use the email and password you created in Firebase Console
   - Should redirect back to dashboard

4. **Test logout**:
   - Click logout button
   - Should redirect to login

## Step 7: Deploy to Production

1. **Update Netlify environment variables**:
   - Already configured ✅

2. **Deploy**:
   ```bash
   git add .
   git commit -m "Implement Firebase Authentication"
   git push
   ```

3. **Update Firestore Rules** in Firebase Console

4. **Test production login**

## Troubleshooting

### "Firebase: Error (auth/network-request-failed)"
- Check that your domain is authorized in Firebase Console
- Check internet connection

### "Firebase: Error (auth/user-not-found)"
- User doesn't exist - create in Firebase Console

### "Firebase: Error (auth/wrong-password)"
- Password is incorrect

### "You don't have admin access"
- Email not in admin list
- Check Firestore `config/admins` document

### "Firebase: Error (auth/too-many-requests)"
- Too many failed login attempts
- Wait a few minutes or reset password

## Security Checklist

- [ ] Authentication enabled in Firebase Console
- [ ] Admin user created
- [ ] Admin emails configured in Firestore
- [ ] Firestore security rules updated
- [ ] Authorized domains configured
- [ ] Old password-protection.tsx removed
- [ ] All routes protected with AuthProvider
- [ ] Tested login/logout flow

## Next Steps

1. **Enable Multi-Factor Authentication** (Optional)
   - Go to Authentication → Settings → Multi-factor auth
   
2. **Set up Email Verification** (Optional)
   - Configure email templates in Authentication → Templates

3. **Add Password Reset Flow**
   - Already implemented in login form

4. **Configure Session Duration**
   - Authentication → Settings → User sessions

---

**Your Firebase Project**: `scago-feedback`  
**Auth Domain**: `scago-feedback.firebaseapp.com`  
**Status**: Ready to implement ✅

