/**
 * Page Permissions System
 *
 * Defines all available page permissions that can be assigned to admin users.
 * Super admins have access to everything automatically.
 * Regular admins get page-level permissions assigned via Firestore.
 */

export type PagePermissionKey =
  | 'user-management'
  | 'forms-dashboard'
  | 'forms-editor'
  | 'yep-portal'
  | 'yep-dashboard'
  | 'yep-forms';

export interface PagePermission {
  key: PagePermissionKey;
  label: string;
  description: string;
  route: string;
}

/**
 * All available page permissions with descriptions for UI tooltips
 */
export const PAGE_PERMISSIONS: PagePermission[] = [
  {
    key: 'user-management',
    label: 'User Management',
    description: 'Create, edit, and manage all platform users and their roles',
    route: '/admin',
  },
  {
    key: 'forms-dashboard',
    label: 'Forms Dashboard',
    description: 'View survey responses, analytics, and export data',
    route: '/dashboard',
  },
  {
    key: 'forms-editor',
    label: 'Survey Editor',
    description: 'Create and edit survey forms and templates',
    route: '/editor',
  },
  {
    key: 'yep-portal',
    label: 'YEP Portal',
    description: 'Access Youth Empowerment Program overview and navigation',
    route: '/youth-empowerment',
  },
  {
    key: 'yep-dashboard',
    label: 'YEP Analytics',
    description: 'View participant/mentor statistics and program metrics',
    route: '/youth-empowerment/dashboard',
  },
  {
    key: 'yep-forms',
    label: 'YEP Forms Management',
    description: 'Manage YEP-specific registration and intake forms',
    route: '/yep-forms',
  },
];

/**
 * Map routes to required permissions
 */
export const ROUTE_PERMISSION_MAP: Record<string, PagePermissionKey> = {
  '/admin': 'user-management',
  '/dashboard': 'forms-dashboard',
  '/editor': 'forms-editor',
  '/youth-empowerment': 'yep-portal',
  '/youth-empowerment/dashboard': 'yep-dashboard',
  '/yep-forms': 'yep-forms',
};

/**
 * Get page permission details by key
 */
export function getPermissionByKey(key: PagePermissionKey): PagePermission | undefined {
  return PAGE_PERMISSIONS.find(p => p.key === key);
}

/**
 * Get permission label for display
 */
export function getPermissionLabel(key: PagePermissionKey): string {
  return getPermissionByKey(key)?.label || key;
}

/**
 * Get permission description for tooltips
 */
export function getPermissionDescription(key: PagePermissionKey): string {
  return getPermissionByKey(key)?.description || '';
}

/**
 * Get required permission for a route
 */
export function getRequiredPermission(route: string): PagePermissionKey | null {
  // Check for exact match
  if (ROUTE_PERMISSION_MAP[route]) {
    return ROUTE_PERMISSION_MAP[route];
  }

  // Check for route prefixes
  for (const [mappedRoute, permission] of Object.entries(ROUTE_PERMISSION_MAP)) {
    if (route.startsWith(mappedRoute)) {
      return permission;
    }
  }

  return null;
}
