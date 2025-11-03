# 🔐 Authentication & Authorization System Guide

## Overview

This application uses Firebase Authentication with a custom role-based access control (RBAC) system optimized for a small nonprofit organization managing multiple programs.

---

## 🎯 **Role Structure**

We use **4 roles** (no redundant "user" role):

| Role | Description | Access Level |
|------|-------------|--------------|
| `super-admin` | Super administrator (you) | Full access to everything, including user management |
| `admin` | Program administrators | Page-level permissions assigned per admin |
| `mentor` | YEP mentors | Profile access only |
| `participant` | YEP participants | Profile access only |

---

## 🔑 **How It Works**

### **1. Single Source of Truth: Custom Claims**

Roles are stored **exclusively** in Firebase Auth custom claims:

```typescript
// Custom claims structure
{
  role: 'super-admin' | 'admin' | 'mentor' | 'participant'
}
```

✅ **Benefits:**
- Included in JWT token (no extra DB lookup)
- Verified on every request
- Can't be tampered with by client
- Fast and secure

❌ **Legacy Code Removed:**
- No more Firestore `config/admins` checks
- No more `config/yep_managers` checks
- No more participant/mentor Firestore fallbacks

---

### **2. Page-Level Permissions (For Admins)**

Regular `admin` users get granular page permissions stored in Firestore:

```javascript
// Firestore: config/page_permissions
{
  routesByEmail: {
    "admin1@nonprofit.org": ["forms-dashboard", "forms-editor"],
    "admin2@nonprofit.org": ["yep-portal", "yep-dashboard"]
  }
}
```

**Super admins** (`super-admin` role) **always have full access** - no need to assign permissions.

---

## 📍 **Available Page Permissions**

| Permission Key | Route | Description |
|----------------|-------|-------------|
| `user-management` | `/admin` | Create, edit, and manage all platform users and their roles |
| `forms-dashboard` | `/dashboard` | View survey responses, analytics, and export data |
| `forms-editor` | `/editor` | Create and edit survey forms and templates |
| `yep-portal` | `/youth-empowerment` | Access Youth Empowerment Program overview and navigation |
| `yep-dashboard` | `/youth-empowerment/dashboard` | View participant/mentor statistics and program metrics |
| `yep-forms` | `/yep-forms` | Manage YEP-specific registration and intake forms |

---

## 🚀 **Initial Setup: Bootstrap Your First Super Admin**

### **Step 1: Create Your User Account**

1. Go to `/login`
2. Click "Register here"
3. Create account with `tech@sicklecellanemia.ca`

### **Step 2: Run Bootstrap Script**

```bash
node scripts/bootstrap-admin.js
```

This will:
- Find your user by email (`tech@sicklecellanemia.ca` is hardcoded)
- Set custom claim `{ role: 'super-admin' }`
- Grant you full access

### **Step 3: Login**

1. Logout if currently logged in
2. Login again at `/login`
3. You'll be redirected to `/admin`
4. ✅ You now have full super admin access!

---

## 👥 **Creating New Users (From Admin Panel)**

### **Super Admin Can:**

1. Go to `/admin` → **Users** tab
2. Click **"Create User"**
3. Fill in:
   - Email
   - Password
   - Display Name
   - **Role** (dropdown): `super-admin`, `admin`, `mentor`, `participant`
   - **Page Permissions** (if role = `admin`): Check boxes for pages they can access

4. Click **"Create User"**

✅ User is created with custom claim set immediately!

### **Setting Permissions for Existing Admins:**

1. Go to `/admin` → **Users** tab
2. Click on admin user
3. **Edit Role** → Select `admin`
4. **Edit Page Permissions** → Check boxes for pages
5. Save

---

## 🔒 **How Access Control Works**

### **Server-Side (Authoritative)**

All protected routes use layout middleware with `force-dynamic` + `revalidate: 0`:

```typescript
// Example: /admin/layout.tsx
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminLayout({ children }) {
  await enforcePagePermission('user-management');
  return <>{children}</>;
}
```

**Enforcement Logic:**

```typescript
// Super admin: Always allow
if (session.role === 'super-admin') return allow;

// Admin: Check page permissions
if (session.role === 'admin') {
  const permissions = getPagePermissions(email);
  return permissions.includes('user-management');
}

// Participant/Mentor: Deny admin pages
redirect('/unauthorized');
```

### **Client-Side (UX Enhancement)**

- `AuthProvider` context provides `{ user, role, isAdmin, isSuperAdmin }`
- Automatically redirects unauthenticated users to `/login`
- **NOT a security boundary** - server layouts are final authority

---

## 📊 **Login Redirects by Role**

| Role | Redirect Destination |
|------|---------------------|
| `super-admin` | `/admin` |
| `admin` | `/admin` |
| `mentor` | `/profile` |
| `participant` | `/profile` |

---

## 📝 **Audit Logging**

All role and permission changes are logged to Firestore `user_activity` collection:

```javascript
{
  userId: "abc123",
  userEmail: "admin@nonprofit.org",
  action: "role_changed",
  details: { oldRole: "participant", newRole: "admin" },
  timestamp: "2025-11-03T10:30:00Z"
}
```

**Logged Actions:**
- `user_created` - New user created
- `role_changed` - Role updated
- `permissions_changed` - Page permissions updated

---

## 🗂️ **File Structure**

### **Core Auth Files:**

| File | Purpose |
|------|---------|
| `src/lib/server-auth.ts` | Server-side session verification & enforcement |
| `src/lib/permissions.ts` | Page permission definitions |
| `src/app/admin/user-actions.ts` | User management server actions (create, update, delete) |
| `src/lib/firebase-auth.ts` | Client-side auth functions |
| `scripts/bootstrap-admin.js` | Bootstrap first super admin |

### **Layout Files (Protection):**

| File | Permission Required |
|------|---------------------|
| `src/app/admin/layout.tsx` | `user-management` |
| `src/app/dashboard/layout.tsx` | `forms-dashboard` |
| `src/app/editor/layout.tsx` | `forms-editor` |
| `src/app/youth-empowerment/layout.tsx` | `yep-portal` |
| `src/app/yep-forms/(admin)/layout.tsx` | `yep-forms` |

### **Auth UI Components:**

| File | Purpose |
|------|---------|
| `src/components/auth/login-form.tsx` | Login form with role-based redirects |
| `src/components/auth/auth-provider.tsx` | Client-side auth context provider |
| `src/components/admin/enhanced-user-management.tsx` | Admin UI for user management |

---

## 🔧 **Common Operations**

### **Set User Role (from code):**

```typescript
import { setUserRole } from '@/app/admin/user-actions';

await setUserRole('user-uid-here', 'admin');
```

### **Set Page Permissions (from code):**

```typescript
import { setUserPagePermissions } from '@/app/admin/user-actions';

await setUserPagePermissions('admin@example.com', [
  'forms-dashboard',
  'forms-editor'
]);
```

### **Check Permission (server-side):**

```typescript
import { hasPagePermission } from '@/lib/server-auth';

const canAccess = await hasPagePermission('admin@example.com', 'yep-portal');
```

---

## 🚨 **Troubleshooting**

### **"No role assigned" error on login**

**Cause:** User has no custom claim set.

**Fix:**
```bash
# For super admin
node scripts/bootstrap-admin.js user@example.com

# For other users, use admin panel
# Or manually set with Firebase Admin SDK
```

### **Admin can't access a page**

**Cause:** Missing page permission.

**Fix:**
1. Go to `/admin` → Users tab
2. Find admin user
3. Edit Page Permissions → Check required permission
4. Admin must logout and login again

### **Custom claims not updating immediately**

**Cause:** Firebase tokens are cached.

**Fix:**
1. Force token refresh by logging out and back in
2. Or wait ~1 hour for token expiry

---

## ✅ **Security Checklist**

- ✅ Custom claims as single source of truth
- ✅ HTTP-only session cookies (14-day expiry)
- ✅ Server-side enforcement on every request (`force-dynamic`)
- ✅ No Firestore role fallbacks (clean, fast)
- ✅ Audit logging for all role/permission changes
- ✅ Super admin can't be locked out (always has full access)
- ✅ Page-level granular permissions for admins

---

## 📚 **Additional Resources**

- **Firebase Auth Custom Claims:** https://firebase.google.com/docs/auth/admin/custom-claims
- **Next.js Middleware:** https://nextjs.org/docs/app/building-your-application/routing/middleware
- **Firebase Admin SDK:** https://firebase.google.com/docs/admin/setup

---

## 🎉 **You're All Set!**

Your authentication system is now:
- ✅ **Simple** - 4 roles, no redundancy
- ✅ **Secure** - Custom claims + server-side enforcement
- ✅ **Scalable** - Page-level permissions for flexibility
- ✅ **Auditable** - All changes logged
- ✅ **Fast** - No extra DB lookups for roles

**Next Steps:**
1. Run bootstrap script to make yourself super admin
2. Login and access `/admin`
3. Create your program admins
4. Assign them page permissions
5. Enjoy! 🎊
