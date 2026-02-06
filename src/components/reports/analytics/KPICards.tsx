'use client';

import { Card, CardContent } from '@/components/ui/card';
import { ClipboardCheck, Users, TrendingUp, Star } from 'lucide-react';

interface KPICardsProps {
    summary: {
        totalInteractions: number;
        uniquePatients: number;
        topService: string;
    };
}

export function KPICards({ summary }: KPICardsProps) {
    const kpis = [
        {
            title: 'Total Interactions',
            value: summary.totalInteractions,
            icon: ClipboardCheck,
            description: 'Total logged activities',
            gradient: 'from-blue-500/10 to-indigo-500/10',
            iconColor: 'text-blue-600'
        },
        {
            title: 'Unique Patients',
            value: summary.uniquePatients,
            icon: Users,
            description: 'Distinct patients served',
            gradient: 'from-purple-500/10 to-pink-500/10',
            iconColor: 'text-purple-600'
        },
        {
            title: 'Top Service',
            value: summary.topService,
            icon: Star,
            description: 'Most frequently provided',
            gradient: 'from-amber-500/10 to-orange-500/10',
            iconColor: 'text-amber-600'
        },
        {
            title: 'Growth Status',
            value: 'Active',
            icon: TrendingUp,
            description: 'Engagement is steady',
            gradient: 'from-emerald-500/10 to-teal-500/10',
            iconColor: 'text-emerald-600'
        }
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {kpis.map((kpi, i) => (
                <Card key={i} className="border-none bg-card/40 backdrop-blur-md shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden group">
                    <div className={`absolute inset-0 bg-gradient-to-br ${kpi.gradient} opacity-50 group-hover:opacity-100 transition-opacity`} />
                    <CardContent className="p-6 relative">
                        <div className="flex justify-between items-start">
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-muted-foreground">{kpi.title}</p>
                                <div className="text-2xl font-bold tracking-tight">
                                    {typeof kpi.value === 'number' ? kpi.value.toLocaleString() : kpi.value}
                                </div>
                                <p className="text-xs text-muted-foreground">{kpi.description}</p>
                            </div>
                            <div className={`p-2 rounded-xl bg-background/50 border border-white/10 shadow-sm ${kpi.iconColor}`}>
                                <kpi.icon className="h-5 w-5" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
