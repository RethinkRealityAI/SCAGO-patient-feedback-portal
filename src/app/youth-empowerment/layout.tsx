import React from 'react';
import { enforceYEPAccessOrRedirect } from '@/lib/server-auth';

// Force dynamic rendering to ensure cookies are read on every request
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function YEPLayout({ children }: { children: React.ReactNode }) {
  await enforceYEPAccessOrRedirect();
  return <>{children}</>;
}


