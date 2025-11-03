import React from 'react';
import { enforcePagePermission } from '@/lib/server-auth';

// Force dynamic rendering to ensure cookies are read on every request
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function YEPLayout({ children }: { children: React.ReactNode }) {
  // Require 'yep-portal' permission
  await enforcePagePermission('yep-portal');
  return <>{children}</>;
}


