import React from 'react';

export default async function ProgramReportsLayout({ children }: { children: React.ReactNode }) {
    // Require 'program-reports' permission (super admins always have access)
    const { enforcePagePermission } = await import('@/lib/server-auth');
    await enforcePagePermission('program-reports');
    return <>{children}</>;
}
