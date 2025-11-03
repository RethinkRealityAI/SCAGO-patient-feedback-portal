import React from 'react';
import { enforcePagePermission } from '@/lib/server-auth';

// Force dynamic rendering to ensure cookies are read on every request
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function EditorLayout({ children }: { children: React.ReactNode }) {
  // Require 'forms-editor' permission (super admins always have access)
  await enforcePagePermission('forms-editor');
  return <>{children}</>;
}


