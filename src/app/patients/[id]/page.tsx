import { Suspense } from 'react';
import { PatientProfile } from '@/components/patients/PatientProfile';
import { Loader2 } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function PatientProfilePage({ params }: PageProps) {
    const { id } = await params;

    return (
        <div className="container mx-auto py-6">
            <Suspense
                fallback={
                    <div className="flex items-center justify-center h-screen">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                }
            >
                <PatientProfile patientId={id} />
            </Suspense>
        </div>
    );
}
