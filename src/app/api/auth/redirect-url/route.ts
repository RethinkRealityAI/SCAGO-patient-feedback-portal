/**
 * API route to get the appropriate redirect URL for a user after login
 * based on their role and permissions
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession, getAccessiblePages } from '@/lib/server-auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session) {
      return NextResponse.json({ redirectUrl: '/login' }, { status: 401 });
    }

    const { email, role } = session;

    // Participants and mentors go to profile
    if (role === 'participant' || role === 'mentor') {
      return NextResponse.json({ redirectUrl: '/profile' });
    }

    // Super admins go to user management
    if (role === 'super-admin') {
      return NextResponse.json({ redirectUrl: '/admin' });
    }

    // Regular admins: get their first accessible page
    if (role === 'admin') {
      const accessiblePages = await getAccessiblePages(email, role);

      if (accessiblePages.length > 0) {
        // Return the first accessible page
        return NextResponse.json({ redirectUrl: accessiblePages[0].route });
      } else {
        // Admin with no permissions - redirect to profile or show error
        return NextResponse.json({
          redirectUrl: '/unauthorized',
          error: 'No page permissions assigned'
        });
      }
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
