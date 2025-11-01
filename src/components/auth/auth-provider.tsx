'use client';

import { createContext, useEffect, useState, ReactNode, useRef } from 'react';
import { User } from 'firebase/auth';
import { onAuthChange, isUserAdmin, isUserYEPManager, getUserRole } from '@/lib/firebase-auth';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { usePathname, useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  isYEPManager: boolean;
  userRole: 'admin' | 'yep-manager' | 'user' | null;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAdmin: false,
  isYEPManager: false,
  userRole: null,
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
  const [isYEPManager, setIsYEPManager] = useState(false);
  const [userRole, setUserRole] = useState<'admin' | 'yep-manager' | 'user' | null>(null);
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
            const hasRoleCookie = typeof document !== 'undefined' && document.cookie.includes('app_role=');
            if (!sessionPostedRef.current && !hasRoleCookie) {
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
          const [adminStatus, yepManagerStatus, userRole] = await Promise.all([
            isUserAdmin(authUser.email),
            isUserYEPManager(authUser.email),
            getUserRole(authUser.email)
          ]);
          
          setIsAdmin(adminStatus);
          setIsYEPManager(yepManagerStatus);
          setUserRole(userRole);
          
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
          setIsYEPManager(false);
          setUserRole(null);
          
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
    <AuthContext.Provider value={{ user, loading, isAdmin, isYEPManager, userRole }}>
      {children}
    </AuthContext.Provider>
  );
}

