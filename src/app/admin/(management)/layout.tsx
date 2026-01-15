import React from 'react';

export default async function AdminManagementLayout({ children }: { children: React.ReactNode }) {
    // Require 'user-management' permission (super admins always have access)
    const { enforcePagePermission } = await import('@/lib/server-auth');
    await enforcePagePermission('user-management');
    return <>{children}</>;
}
