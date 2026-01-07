import { Suspense } from 'react';
import { PatientList } from '@/components/patients/PatientList';
import { PatientStats } from '@/components/patients/PatientStats';
import { Loader2 } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function PatientsPage() {
    return (
        <div className="container mx-auto py-6 space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Patient Management</h1>
                <p className="text-muted-foreground">
                    Manage patient records, track interactions, and handle documents.
                </p>
            </div>

            {/* Statistics Cards */}
            <Suspense
                fallback={
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
                        ))}
                    </div>
                }
            >
                <PatientStats />
            </Suspense>

            {/* Patient List */}
            <Suspense
                fallback={
                    <div className="flex items-center justify-center h-[400px]">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                }
            >
                <PatientList />
            </Suspense>
        </div>
    );
}
