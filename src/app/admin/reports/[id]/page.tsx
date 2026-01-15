import { ProgramReportForm } from '@/components/reports/ProgramReportForm';
import { getReport } from '@/app/admin/reports/actions';
import { getServerSession } from '@/lib/server-auth';
import { redirect, notFound } from 'next/navigation';

interface EditReportPageProps {
    params: {
        id: string;
    };
}

export default async function EditReportPage({ params }: EditReportPageProps) {
    const session = await getServerSession();

    if (!session || (session.role !== 'admin' && session.role !== 'super-admin')) {
        redirect('/dashboard');
    }

    const result = await getReport(params.id);

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
