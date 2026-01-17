import { ProgramReportsList } from '@/components/reports/ProgramReportsList';

// Force dynamic rendering to ensure cookies are read on every request
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ReportsPage() {
    return (
        <div className="container mx-auto py-10 space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Program Reporting</h2>
                    <p className="text-muted-foreground">
                        Monthly metrics and support reporting for hemoglobinopathy programs.
                    </p>
                </div>
            </div>

            <ProgramReportsList />
        </div>
    );
}
