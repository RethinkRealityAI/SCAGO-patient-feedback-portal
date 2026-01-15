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
  Users,
  Book,
  BarChart3,
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
  const { user, isSuperAdmin, isAdmin, permissions, loading } = useContext(AuthContext);

  if (!user || loading) {
    return [];
  }

  const navItems: NavItem[] = [];

  // 1. Profile (All authenticated users)
  navItems.push({
    href: '/profile',
    label: 'Profile',
    icon: <User className="h-4 w-4" />,
  });

  // 2. Surveys (All authenticated users)
  navItems.push({
    href: '/',
    label: 'Surveys',
    icon: <FileText className="h-4 w-4" />,
  });

  // 3. Resources (All authenticated users)
  navItems.push({
    href: '/resources',
    label: 'Resources',
    icon: <Book className="h-4 w-4" />,
  });

  // Helper to check if user has access to a permission
  const hasAccess = (key: PagePermissionKey) => isSuperAdmin || (isAdmin && permissions.includes(key));

  // 4. Forms Dashboard (SCAGO)
  if (hasAccess('forms-dashboard')) {
    navItems.push({
      href: '/dashboard',
      label: 'Survey Dashboard',
      icon: <Home className="h-4 w-4" />,
      permission: 'forms-dashboard',
    });
  }

  // 5. Patient Management
  if (hasAccess('patient-management')) {
    navItems.push({
      href: '/patients',
      label: 'Patients',
      icon: <Users className="h-4 w-4" />,
      permission: 'patient-management',
    });
  }

  // 6. Survey Editor
  if (hasAccess('forms-editor')) {
    navItems.push({
      href: '/editor',
      label: 'Survey Editor',
      icon: <ClipboardList className="h-4 w-4" />,
      permission: 'forms-editor',
    });
  }

  // 7. YEP Portal
  if (hasAccess('yep-portal')) {
    navItems.push({
      href: '/youth-empowerment',
      label: 'YEP Portal',
      icon: <GraduationCap className="h-4 w-4" />,
      permission: 'yep-portal',
    });
  }

  // 8. YEP Analytics Dashboard
  if (hasAccess('yep-dashboard')) {
    navItems.push({
      href: '/youth-empowerment/dashboard',
      label: 'YEP Analytics',
      icon: <BarChart3 className="h-4 w-4" />,
      permission: 'yep-dashboard',
    });
  }

  // 9. YEP Forms
  if (hasAccess('yep-forms')) {
    navItems.push({
      href: '/yep-forms',
      label: 'YEP Forms',
      icon: <ClipboardList className="h-4 w-4" />,
      permission: 'yep-forms',
    });
  }

  // 10. Program Reports
  if (hasAccess('program-reports')) {
    navItems.push({
      href: '/admin/reports',
      label: 'Program Reports',
      icon: <BarChart3 className="h-4 w-4" />,
      permission: 'program-reports',
    });
  }

  // 11. Admin Panel (User Management)
  if (hasAccess('user-management')) {
    navItems.push({
      href: '/admin',
      label: 'Admin',
      icon: <Shield className="h-4 w-4" />,
      permission: 'user-management',
    });
  }

  return navItems;
}

