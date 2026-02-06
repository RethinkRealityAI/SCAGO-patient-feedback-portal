'use client';

import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '@/components/auth/auth-provider';
import { PAGE_PERMISSIONS, type PagePermissionKey } from '@/lib/permissions';
import { getPagePermissions } from '@/lib/page-permissions-actions';
import {
  Home,
  ClipboardList,
  FileText,
  Files,
  GraduationCap,
  Shield,
  ShieldCheck,
  User,
  Users,
  Users2,
  Book,
  Library,
  BarChart3,
  LayoutDashboard,
} from 'lucide-react';

export interface NavItem {
  id: string;
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
    id: 'profile',
    href: '/profile',
    label: 'Profile',
    icon: <User className="h-4 w-4" fill="currentColor" />,
  });

  // 2. Surveys (All authenticated users)
  navItems.push({
    id: 'surveys',
    href: '/',
    label: 'Surveys',
    icon: <Files className="h-4 w-4" fill="currentColor" />,
  });

  // 3. Resources (All authenticated users)
  navItems.push({
    id: 'resources',
    href: '/resources',
    label: 'Resources',
    icon: <Library className="h-4 w-4" fill="currentColor" />,
  });

  // Helper to check if user has access to a permission
  const hasAccess = (key: PagePermissionKey) => isSuperAdmin || (isAdmin && permissions.includes(key));

  // 4. Forms Dashboard (SCAGO)
  if (hasAccess('forms-dashboard')) {
    navItems.push({
      id: 'dashboard',
      href: '/dashboard',
      label: 'Survey Dashboard',
      icon: <LayoutDashboard className="h-4 w-4" fill="currentColor" />,
      permission: 'forms-dashboard',
    });
  }

  // 5. Patient Management
  if (hasAccess('patient-management')) {
    navItems.push({
      id: 'patients',
      href: '/patients',
      label: 'Patients',
      icon: <Users2 className="h-4 w-4" fill="currentColor" />,
      permission: 'patient-management',
    });
  }

  // 6. Survey Editor
  if (hasAccess('forms-editor')) {
    navItems.push({
      id: 'editor',
      href: '/editor',
      label: 'Survey Editor',
      icon: <ClipboardList className="h-4 w-4" fill="currentColor" />,
      permission: 'forms-editor',
    });
  }

  // 7. YEP Portal
  if (hasAccess('yep-portal')) {
    navItems.push({
      id: 'yep-portal',
      href: '/youth-empowerment',
      label: 'YEP Portal',
      icon: <GraduationCap className="h-4 w-4" fill="currentColor" />,
      permission: 'yep-portal',
    });
  }

  // 8. YEP Analytics Dashboard
  if (hasAccess('yep-dashboard')) {
    navItems.push({
      id: 'yep-analytics',
      href: '/youth-empowerment/dashboard',
      label: 'YEP Analytics',
      icon: <BarChart3 className="h-4 w-4" fill="currentColor" />,
      permission: 'yep-dashboard',
    });
  }

  // 9. YEP Forms
  if (hasAccess('yep-forms')) {
    navItems.push({
      id: 'yep-forms',
      href: '/yep-forms',
      label: 'YEP Forms',
      icon: <ClipboardList className="h-4 w-4" fill="currentColor" />,
      permission: 'yep-forms',
    });
  }

  // 10. Program Reports
  if (hasAccess('program-reports')) {
    navItems.push({
      id: 'reports',
      href: '/admin/reports',
      label: 'Program Reports',
      icon: <BarChart3 className="h-4 w-4" fill="currentColor" />,
      permission: 'program-reports',
    });
  }

  // 11. Admin Panel (User Management)
  if (hasAccess('user-management')) {
    navItems.push({
      id: 'admin',
      href: '/admin',
      label: 'Admin',
      icon: <ShieldCheck className="h-4 w-4" fill="currentColor" />,
      permission: 'user-management',
    });
  }

  return navItems;
}

