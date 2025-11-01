import React from 'react';
import { enforceAdminOrRedirect } from '@/lib/server-auth';

// Force dynamic rendering to ensure cookies are read on every request
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await enforceAdminOrRedirect();
  return <>{children}</>;
}


