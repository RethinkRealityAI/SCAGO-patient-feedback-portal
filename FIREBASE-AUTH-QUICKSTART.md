# 🔐 Firebase Authentication - Quick Start Guide

## TL;DR - What You Need to Do

Your Firebase project **`scago-feedback`** is already configured! Just need to enable Authentication.

## ⚡ 5-Minute Setup

### Step 1: Enable Authentication (2 minutes)

1. **Go to**: https://console.firebase.google.com/project/scago-feedback/authentication
2. **Click**: "Get started" button
3. **Click**: "Sign-in method" tab
4. **Enable**: "Email/Password"
   - Click on "Email/Password"
   - Toggle ON the first switch
   - Click "Save"

### Step 2: Create Your Admin Account (1 minute)

1. **Click**: "Users" tab
2. **Click**: "Add user" button
3. **Enter**:
   - Email: `your-email@example.com`
   - Password: Choose a secure password (save it!)
4. **Click**: "Add user"

### Step 3: Configure Admin Access (2 minutes)

1. **Go to**: https://console.firebase.google.com/project/scago-feedback/firestore
2. **Create Collection**: `config`
3. **Create Document**: 
   - Document ID: `admins`
   - Add field:
     - Field name: `emails`
     - Type: `array`
     - Values: Add your admin email(s)
       ```
       - your-email@example.com
       - another-admin@example.com
       ```
4. **Click**: "Save"

### Step 4: Update Firestore Rules (1 minute)

1. **Go to**: https://console.firebase.google.com/project/scago-feedback/firestore/rules
2. **Replace** existing rules with content from `docs/firestore-auth-rules.txt`
3. **Click**: "Publish"

### Step 5: Update Your App Layout

Replace the password protection with authentication:

```typescript
// src/app/layout.tsx
import { AuthProvider } from '@/components/auth/auth-provider';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
```

### Step 6: Test It! (1 minute)

```bash
npm run dev
```

1. Go to: `http://localhost:9002/dashboard`
2. Should redirect to `/login`
3. Enter your email and password
4. Should login and redirect to dashboard!

## ✅ What Was Implemented

### New Files Created:
- ✅ `src/lib/firebase-auth.ts` - Authentication functions
- ✅ `src/hooks/use-auth.ts` - React hook for auth
- ✅ `src/components/auth/auth-provider.tsx` - Auth context
- ✅ `src/components/auth/login-form.tsx` - Beautiful login UI
- ✅ `src/app/login/page.tsx` - Login page
- ✅ `src/app/unauthorized/page.tsx` - Access denied page
- ✅ `docs/firestore-auth-rules.txt` - Security rules

### Updated Files:
- ✅ `src/lib/firebase.ts` - Added `getAuth()` export

## 🎨 Login Features

Your new login form has:
- ✅ Email/password authentication
- ✅ Password reset flow (forgot password link)
- ✅ Beautiful UI with loading states
- ✅ Error handling with friendly messages
- ✅ Automatic redirect after login
- ✅ Admin-only access enforcement

## 🔒 Security Features

- ✅ Email-based admin list in Firestore
- ✅ Automatic redirect for non-admin users
- ✅ Protected routes (dashboard, editor)
- ✅ Public routes (surveys, login)
- ✅ Firestore rules enforce server-side security
- ✅ Session-based authentication

## 📱 Usage in Your Components

### Check if user is logged in:
```typescript
import { useAuth } from '@/hooks/use-auth';

function MyComponent() {
  const { user, isAdmin, loading } = useAuth();
  
  if (loading) return <div>Loading...</div>;
  if (!user) return <div>Please log in</div>;
  
  return <div>Welcome {user.email}!</div>;
}
```

### Add logout button:
```typescript
import { signOut } from '@/lib/firebase-auth';

function LogoutButton() {
  const handleLogout = async () => {
    await signOut();
    // AuthProvider handles redirect
  };
  
  return <Button onClick={handleLogout}>Logout</Button>;
}
```

### Protect a page:
```typescript
'use client';

import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AdminPage() {
  const { user, isAdmin, loading } = useAuth();
  const router = useRouter();
  
  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      router.push('/unauthorized');
    }
  }, [user, isAdmin, loading, router]);
  
  if (loading) return <div>Loading...</div>;
  if (!isAdmin) return null;
  
  return <div>Admin content here</div>;
}
```

## 🚀 Deployment Checklist

Before deploying to production:

### Firebase Console:
- [ ] Authentication enabled
- [ ] Admin user created
- [ ] Admin emails in `config/admins` Firestore document
- [ ] Firestore security rules updated
- [ ] Authorized domains added (your Netlify domain)

### Code:
- [ ] AuthProvider added to layout
- [ ] Old password-protection removed
- [ ] Login page tested
- [ ] Logout functionality tested
- [ ] Protected routes verified

### Netlify:
- [ ] Environment variables already set ✅
- [ ] Build successful
- [ ] Login works in production

## 🆘 Troubleshooting

### "Error (auth/network-request-failed)"
**Solution**: Check if email/password auth is enabled in Firebase Console

### "Error (auth/user-not-found)"
**Solution**: Create user in Firebase Console → Authentication → Users

### "You don't have admin access"
**Solution**: Add your email to Firestore → `config/admins` → `emails` array

### "Error (auth/operation-not-allowed)"
**Solution**: Enable Email/Password in Firebase Console → Authentication → Sign-in method

### Can't access any pages
**Solution**: Make sure `AuthProvider` is in your root layout

## 📊 Admin Management

### Add a New Admin:
1. Go to Firestore: `config/admins`
2. Add email to `emails` array
3. User must still create account via login page or Firebase Console

### Remove Admin Access:
1. Go to Firestore: `config/admins`
2. Remove email from `emails` array

### Create User Account:
1. Firebase Console → Authentication → Users
2. Click "Add user"
3. Enter email and password

### Reset User Password:
**Option 1**: User clicks "Forgot password" on login page
**Option 2**: Firebase Console → Authentication → Users → Click user → Reset password

## 🎯 Next Steps (Optional)

1. **Email Verification**
   - Enable in Firebase Console → Authentication → Templates
   - Require verified email for admin access

2. **Multi-Factor Authentication**
   - Enable in Firebase Console → Authentication → Settings
   - Require for admin users

3. **Custom Email Templates**
   - Customize password reset emails
   - Add your branding

4. **Audit Logging**
   - Log admin actions
   - Track who accessed what

5. **Role-Based Access**
   - Create roles: `admin`, `viewer`, `editor`
   - Store in Firestore user document

---

## 📞 Need Help?

1. **Check error in console**: Most errors have detailed messages
2. **Verify Firebase Console settings**: Auth enabled? User exists? Admin list configured?
3. **Check Firestore rules**: Are they published?
4. **Test in incognito**: Clear cache/cookies

## ✅ Success Criteria

You've successfully implemented Firebase Auth when:

- ✅ Can access `http://localhost:9002/dashboard` and get redirected to `/login`
- ✅ Can log in with admin credentials
- ✅ Get redirected to dashboard after login
- ✅ Can log out and get redirected to login
- ✅ Non-admin users get "Access Denied" message

---

**Your Firebase Project**: `scago-feedback`  
**Auth Domain**: `scago-feedback.firebaseapp.com`  
**Implementation Status**: ✅ Complete - Ready to Enable  
**Estimated Setup Time**: 5 minutes

