/**
 * API route to get the appropriate redirect URL for a user after login
 * based on their role and permissions
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession, getAccessiblePages } from '@/lib/server-auth';
import { PAGE_PERMISSIONS } from '@/lib/permissions';

const SHARED_LANDING_ROUTES = ['/', '/profile', '/resources'];

function getAccessibleRoutesForRole(role: string, accessiblePages: Array<{ route: string }>) {
  if (role === 'participant' || role === 'mentor') {
    return SHARED_LANDING_ROUTES;
  }
  if (role === 'super-admin') {
    return [...new Set([...SHARED_LANDING_ROUTES, ...PAGE_PERMISSIONS.map((page) => page.route)])];
  }
  return [...new Set([...SHARED_LANDING_ROUTES, ...accessiblePages.map((page) => page.route)])];
}

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session) {
      return NextResponse.json({ redirectUrl: '/login' }, { status: 401 });
    }

    const { email, role } = session;

    const accessiblePages = await getAccessiblePages(email, role);
    const accessibleRoutes = getAccessibleRoutesForRole(role, accessiblePages);

    // Prefer configured default view when it is accessible for this user.
    try {
      const { getAdminFirestore } = await import('@/lib/firebase-admin');
      const firestore = getAdminFirestore();
      const permissionsDoc = await firestore.collection('config').doc('page_permissions').get();
      const defaultViewByEmail = permissionsDoc.exists
        ? (((permissionsDoc.data() as any)?.defaultViewByEmail || {}) as Record<string, string>)
        : {};
      const configuredDefaultView = defaultViewByEmail[email.toLowerCase()];
      if (configuredDefaultView && accessibleRoutes.includes(configuredDefaultView)) {
        return NextResponse.json({ redirectUrl: configuredDefaultView });
      }
    } catch (err) {
      console.error('[redirect-url] Failed reading default view map:', err);
    }

    if (role === 'participant' || role === 'mentor') {
      return NextResponse.json({ redirectUrl: '/profile' });
    }

    if (role === 'super-admin') {
      return NextResponse.json({ redirectUrl: '/admin' });
    }

    if (role === 'admin') {
      if (accessiblePages.length > 0) {
        return NextResponse.json({ redirectUrl: accessiblePages[0].route });
      }
      return NextResponse.json({
        redirectUrl: '/unauthorized',
        error: 'No page permissions assigned'
      });
    }

    // Fallback
    return NextResponse.json({ redirectUrl: '/profile' });
  } catch (error) {
    console.error('[redirect-url] Error:', error);
    return NextResponse.json(
      { error: 'Failed to determine redirect URL' },
      { status: 500 }
    );
  }
}
