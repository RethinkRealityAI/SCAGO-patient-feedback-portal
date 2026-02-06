'use client';

import { Suspense } from 'react';
import { PatientList } from '@/components/patients/PatientList';
import { PatientStats } from '@/components/patients/PatientStats';
import { PatientTutorialModal } from '@/components/patients/patient-tutorial-modal';
import { Loader2, Users2 } from 'lucide-react';

export default function PatientsPage() {
    return (
        <div className="container mx-auto py-6 space-y-8">
            <PatientTutorialModal />

            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
                        <Users2 className="h-6 w-6 text-primary" fill="currentColor" />
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight">Patient Management</h1>
                </div>
                <p className="text-muted-foreground text-lg">
                    Manage patient records, track interactions, and handle documents with ease.
                </p>
            </div>

            <div className="grid gap-8">
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
        </div>
    );
}
