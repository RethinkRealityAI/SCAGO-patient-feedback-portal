import { AnalyticsDashboard } from '@/components/reports/analytics/AnalyticsDashboard';

export const metadata = {
    title: 'Program Analytics | SCAGO Portal',
    description: 'Live analytics and reporting for patient interaction data.',
};

export default function AnalyticsPage() {
    return (
        <div className="container mx-auto py-8 px-4 md:px-6 max-w-7xl animate-in fade-in slide-in-from-bottom-4 duration-700">
            <AnalyticsDashboard />
        </div>
    );
}
