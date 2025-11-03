import React from 'react';

// Force dynamic rendering to ensure cookies are read on every request
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Require 'forms-dashboard' permission (super admins always have access)
  const { enforcePagePermission } = await import('@/lib/server-auth');
  await enforcePagePermission('forms-dashboard');
  return <>{children}</>;
}


