import { ProgramReportForm } from '@/components/reports/ProgramReportForm';
import { getReport } from '@/app/admin/reports/actions';
import { getServerSession } from '@/lib/server-auth';
import { redirect, notFound } from 'next/navigation';

// Force dynamic rendering to ensure cookies are read on every request
export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface EditReportPageProps {
    params: Promise<{ id: string }>;
}

export default async function EditReportPage({ params }: EditReportPageProps) {
    const { id } = await params;
    const session = await getServerSession();

    if (!session || (session.role !== 'admin' && session.role !== 'super-admin')) {
        redirect('/dashboard');
    }

    const result = await getReport(id);

    if (!result.success || !result.data) {
        notFound();
    }

    return (
        <div className="container mx-auto py-10 space-y-8">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Edit Report</h2>
                <p className="text-muted-foreground">
                    Update program metrics for {result.data.hospital} ({result.data.month}/{result.data.year}).
                </p>
            </div>

            <ProgramReportForm report={result.data} isEditMode={true} />
        </div>
    );
}
