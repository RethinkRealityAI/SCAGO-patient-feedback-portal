import React from 'react';

// Force dynamic rendering to ensure cookies are read on every request
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function YEPFormsAdminLayout({ children }: { children: React.ReactNode }) {
  // Require 'yep-forms' permission
  const { enforcePagePermission } = await import('@/lib/server-auth');
  await enforcePagePermission('yep-forms');
  return <>{children}</>;
}


