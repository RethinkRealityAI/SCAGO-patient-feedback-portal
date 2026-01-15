import React from 'react';

// Force dynamic rendering to ensure cookies are read on every request
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Require general admin role (super admins also pass this)
  const { enforceAdminOrRedirect } = await import('@/lib/server-auth');
  await enforceAdminOrRedirect();
  return <>{children}</>;
}


