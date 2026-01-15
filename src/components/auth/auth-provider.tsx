'use client';

import { createContext, useEffect, useState, ReactNode, useRef } from 'react';
import { User } from 'firebase/auth';
import { onAuthChange, isUserAdmin, isUserSuperAdmin, getUserRole } from '@/lib/firebase-auth';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { usePathname, useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isYEPManager: boolean;
  userRole: 'super-admin' | 'admin' | 'mentor' | 'participant' | null;
  permissions: import('@/lib/permissions').PagePermissionKey[];
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAdmin: false,
  isSuperAdmin: false,
  isYEPManager: false,
  userRole: null,
  permissions: [],
});

interface AuthProviderProps {
  children: ReactNode;
}

// Routes that REQUIRE authentication
const ADMIN_ONLY_ROUTES = ['/admin', '/dashboard', '/editor'];
const YEP_ROUTES = ['/youth-empowerment'];

// Public routes - anyone can access without login
// Surveys are intentionally PUBLIC - no authentication required
const PUBLIC_ROUTES = [
  '/',              // Home page
  '/login',         // Login page
  '/survey',        // Survey forms (PUBLIC - no auth needed)
  '/resources',     // Resources page
  '/unauthorized',  // Access denied page
];

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isYEPManager, setIsYEPManager] = useState(false);
  const [userRole, setUserRole] = useState<'super-admin' | 'admin' | 'mentor' | 'participant' | null>(null);
  const [permissions, setPermissions] = useState<import('@/lib/permissions').PagePermissionKey[]>([]);
  const router = useRouter();
  const pathname = usePathname();
  const sessionPostedRef = useRef(false);

  useEffect(() => {
    const unsubscribe = onAuthChange(async (authUser) => {
      try {
        setUser(authUser);

        if (authUser) {
          // Ensure server-side session cookie is set (deduped)
          try {
            if (!sessionPostedRef.current) {
              const idToken = await authUser.getIdToken(true);
              await fetch('/api/auth/session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idToken }),
              });
              sessionPostedRef.current = true;
            }
          } catch (e) {
            // Best-effort; will retry on next auth change if needed
          }
          // Check user roles
          const [adminStatus, superAdminStatus, userRole] = await Promise.all([
            isUserAdmin(authUser.email),
            isUserSuperAdmin(authUser.email),
            getUserRole(authUser.email)
          ]);

          setIsAdmin(adminStatus);
          setIsSuperAdmin(superAdminStatus);
          setIsYEPManager(userRole === 'admin' || userRole === 'super-admin' || userRole === 'mentor'); // Consider mentors as part of YEP management for UI purposes or define more strictly
          setUserRole(userRole);

          // Fetch granular page permissions for admin users
          if (adminStatus && !superAdminStatus && authUser.email) {
            try {
              const { getPagePermissions } = await import('@/lib/page-permissions-actions');
              const permsData = await getPagePermissions();
              const userPerms = permsData.routesByEmail[authUser.email.toLowerCase()] || [];
              setPermissions(userPerms as import('@/lib/permissions').PagePermissionKey[]);
            } catch (err) {
              console.error('Error fetching granular permissions:', err);
              setPermissions([]);
            }
          } else if (superAdminStatus) {
            // Super admins conceptually have all permissions, but the UI might checks specific keys
            // We'll define them as needed or leave empty if the UI handles super-admin separately
            setPermissions([]);
          } else {
            setPermissions([]);
          }

          // Track login (optional - will fail if Firestore rules don't allow)
          if (authUser.email && authUser.uid) {
            try {
              // Use client-side Firestore operations for login tracking
              const { doc, setDoc, updateDoc, getDoc, Timestamp } = await import('firebase/firestore');
              const { db } = await import('@/lib/firebase');

              const userRef = doc(db, 'users', authUser.email);
              const userDoc = await getDoc(userRef);

              if (userDoc.exists()) {
                await updateDoc(userRef, {
                  lastLoginAt: Timestamp.now(),
                  'metadata.lastSignInTime': new Date().toISOString(),
                });
              } else {
                await setDoc(userRef, {
                  email: authUser.email,
                  uid: authUser.uid,
                  createdAt: Timestamp.now(),
                  lastLoginAt: Timestamp.now(),
                  disabled: false,
                  emailVerified: false,
                  metadata: {
                    creationTime: new Date().toISOString(),
                    lastSignInTime: new Date().toISOString(),
                  },
                });
              }
            } catch (error) {
              // Silently fail - login tracking is optional
              console.log('Login tracking skipped (requires Firestore write permissions)');
            }
          }

          // Route access is enforced on the server via layouts. Avoid client-side false negatives.
        } else {
          setIsAdmin(false);
          setIsSuperAdmin(false);
          setIsYEPManager(false);
          setUserRole(null);
          setPermissions([]);

          // Clear server session cookie
          try {
            await fetch('/api/auth/logout', { method: 'POST' });
          } catch (e) {
            // ignore
          }

          // Only redirect to login if trying to access a protected route
          const isAdminOnlyRoute = ADMIN_ONLY_ROUTES.some(route => pathname?.startsWith(route));
          const isYEPRoute = YEP_ROUTES.some(route => pathname?.startsWith(route));
          if (isAdminOnlyRoute || isYEPRoute) {
            // Include the current path as a redirect parameter
            const redirectUrl = encodeURIComponent(pathname || '/');
            router.push(`/login?redirect=${redirectUrl}`);
          }
        }
      } catch (error) {
        console.error('Error in auth state change:', error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router, pathname]);

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, isSuperAdmin, isYEPManager, userRole, permissions }}>
      {children}
    </AuthContext.Provider>
  );
}

