'use client';

import { createContext, useEffect, useState, ReactNode } from 'react';
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

// Routes that REQUIRE authentication and admin access
const PROTECTED_ROUTES = ['/admin', '/dashboard', '/editor'];

// Routes that require YEP Manager or Admin access
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

  useEffect(() => {
    const unsubscribe = onAuthChange(async (authUser) => {
      try {
        setUser(authUser);
        
        if (authUser) {
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
          
          // Check route access permissions
          const isProtectedRoute = PROTECTED_ROUTES.some(route => pathname?.startsWith(route));
          const isYEPRoute = YEP_ROUTES.some(route => pathname?.startsWith(route));
          
          // Admin routes require admin access
          if (isProtectedRoute && !adminStatus) {
            // Check if this is the first time setup
            const adminDoc = await getDoc(doc(db, 'config', 'admins'));
            if (!adminDoc.exists()) {
              router.push('/setup-admin');
            } else {
              router.push('/unauthorized');
            }
          }
          
          // YEP routes require YEP Manager or Admin access
          if (isYEPRoute && !yepManagerStatus && !adminStatus) {
            router.push('/unauthorized');
          }
        } else {
          setIsAdmin(false);
          setIsYEPManager(false);
          setUserRole(null);
          
          // Only redirect to login if trying to access a protected route
          const isProtectedRoute = PROTECTED_ROUTES.some(route => pathname?.startsWith(route));
          const isYEPRoute = YEP_ROUTES.some(route => pathname?.startsWith(route));
          if (isProtectedRoute || isYEPRoute) {
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

