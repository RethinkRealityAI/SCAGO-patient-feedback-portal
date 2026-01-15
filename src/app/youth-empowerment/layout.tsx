import React from 'react';

// Force dynamic rendering to ensure cookies are read on every request
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function YEPLayout({ children }: { children: React.ReactNode }) {
  // Require any YEP-related permission
  const { enforceAnyPagePermission } = await import('@/lib/server-auth');
  await enforceAnyPagePermission(['yep-portal', 'yep-dashboard', 'yep-forms']);
  return <>{children}</>;
}


