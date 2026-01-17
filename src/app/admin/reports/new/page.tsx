import { ProgramReportForm } from '@/components/reports/ProgramReportForm';
import { getServerSession } from '@/lib/server-auth';
import { redirect } from 'next/navigation';

// Force dynamic rendering to ensure cookies are read on every request
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function NewReportPage() {
    const session = await getServerSession();

    if (!session || (session.role !== 'admin' && session.role !== 'super-admin')) {
        redirect('/dashboard');
    }

    return (
        <div className="container mx-auto py-10 space-y-8">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Create New Report</h2>
                <p className="text-muted-foreground">
                    Enter program metrics for a specific hospital and month.
                </p>
            </div>

            <ProgramReportForm />
        </div>
    );
}
