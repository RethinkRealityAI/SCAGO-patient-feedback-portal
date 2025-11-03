'use client';

import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '@/components/auth/auth-provider';
import { PAGE_PERMISSIONS, type PagePermissionKey } from '@/lib/permissions';
import { getPagePermissions } from '@/lib/page-permissions-actions';
import { 
  Home,
  ClipboardList,
  FileText,
  GraduationCap,
  Shield,
  User,
  Book,
} from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  permission?: PagePermissionKey;
}

/**
 * Get navigation items available to the current user based on their role and permissions
 */
export function useUserNavigation(): NavItem[] {
  const { user, userRole, isSuperAdmin, isAdmin } = useContext(AuthContext);
  const [userPermissions, setUserPermissions] = useState<PagePermissionKey[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.email) {
      setLoading(false);
      return;
    }

    // Fetch user permissions for admin users (non-super-admin)
    if (isAdmin && !isSuperAdmin) {
      const fetchPermissions = async () => {
        try {
          const result = await getPagePermissions();
          const permissions = result.routesByEmail[user.email!.toLowerCase()] || [];
          setUserPermissions(permissions as PagePermissionKey[]);
        } catch (error) {
          console.error('Error fetching user permissions:', error);
        } finally {
          setLoading(false);
        }
      };

      fetchPermissions();
    } else {
      setLoading(false);
    }
  }, [user?.email, isAdmin, isSuperAdmin]);

  if (!user) {
    return [];
  }

  const navItems: NavItem[] = [];

  // Public pages available to all authenticated users
  navItems.push({
    href: '/profile',
    label: 'Profile',
    icon: <User className="h-4 w-4" />,
  });

  navItems.push({
    href: '/',
    label: 'Surveys',
    icon: <FileText className="h-4 w-4" />,
  });

  navItems.push({
    href: '/resources',
    label: 'Resources',
    icon: <Book className="h-4 w-4" />,
  });

  // Admin-only pages
  if (isSuperAdmin || (isAdmin && !loading)) {
    // Super admin gets all pages
    if (isSuperAdmin) {
      navItems.push({
        href: '/dashboard',
        label: 'Dashboard',
        icon: <Home className="h-4 w-4" />,
        permission: 'forms-dashboard',
      });
      navItems.push({
        href: '/editor',
        label: 'Editor',
        icon: <ClipboardList className="h-4 w-4" />,
        permission: 'forms-editor',
      });
      navItems.push({
        href: '/youth-empowerment',
        label: 'YEP Portal',
        icon: <GraduationCap className="h-4 w-4" />,
        permission: 'yep-portal',
      });
      navItems.push({
        href: '/admin',
        label: 'Admin',
        icon: <Shield className="h-4 w-4" />,
        permission: 'user-management',
      });
    } else if (isAdmin) {
      // Regular admin - check permissions
      if (userPermissions.includes('forms-dashboard')) {
        navItems.push({
          href: '/dashboard',
          label: 'Dashboard',
          icon: <Home className="h-4 w-4" />,
          permission: 'forms-dashboard',
        });
      }
      if (userPermissions.includes('forms-editor')) {
        navItems.push({
          href: '/editor',
          label: 'Editor',
          icon: <ClipboardList className="h-4 w-4" />,
          permission: 'forms-editor',
        });
      }
      if (userPermissions.includes('yep-portal')) {
        navItems.push({
          href: '/youth-empowerment',
          label: 'YEP Portal',
          icon: <GraduationCap className="h-4 w-4" />,
          permission: 'yep-portal',
        });
      }
      if (userPermissions.includes('user-management')) {
        navItems.push({
          href: '/admin',
          label: 'Admin',
          icon: <Shield className="h-4 w-4" />,
          permission: 'user-management',
        });
      }
    }
  }

  return navItems;
}

