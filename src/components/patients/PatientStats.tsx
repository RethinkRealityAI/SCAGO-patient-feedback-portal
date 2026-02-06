'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, AlertCircle, Clock, Activity } from 'lucide-react';
import { getPatients } from '@/app/patients/actions';
import { Patient } from '@/types/patient';

export function PatientStats() {
    const [stats, setStats] = useState({
        totalActive: 0,
        missingConsent: 0,
        overdueFollowups: 0,
        recentActivity: 0,
    });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        setIsLoading(true);
        try {
            const result = await getPatients();
            if (result.success && result.data) {
                const patients = result.data;

                // Calculate statistics
                const totalActive = patients.filter(p => p.caseStatus === 'active').length;
                const missingConsent = patients.filter(p => p.consentStatus === 'not_obtained').length;

                // Overdue follow-ups: patients with last interaction > 30 days ago
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                const overdueFollowups = patients.filter(p => {
                    if (!p.lastInteraction) return p.caseStatus === 'active';
                    return new Date(p.lastInteraction.date) < thirtyDaysAgo && p.caseStatus === 'active';
                }).length;

                // Recent activity: patients with interaction in last 7 days
                const sevenDaysAgo = new Date();
                sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                const recentActivity = patients.filter(p => {
                    if (!p.lastInteraction) return false;
                    return new Date(p.lastInteraction.date) > sevenDaysAgo;
                }).length;

                setStats({
                    totalActive,
                    missingConsent,
                    overdueFollowups,
                    recentActivity,
                });
            }
        } catch (error) {
            console.error('Error loading stats:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const statCards = [
        {
            title: 'Active Patients',
            value: stats.totalActive,
            icon: Users,
            color: 'text-blue-600',
            bgColor: 'bg-blue-100',
        },
        {
            title: 'Missing Consent',
            value: stats.missingConsent,
            icon: AlertCircle,
            color: 'text-amber-600',
            bgColor: 'bg-amber-100',
        },
        {
            title: 'Overdue Follow-ups',
            value: stats.overdueFollowups,
            icon: Clock,
            color: 'text-red-600',
            bgColor: 'bg-red-100',
        },
        {
            title: 'Recent Activity',
            value: stats.recentActivity,
            icon: Activity,
            color: 'text-green-600',
            bgColor: 'bg-green-100',
        },
    ];

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {[1, 2, 3, 4].map((i) => (
                    <Card key={i}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                            <div className="h-8 w-8 bg-muted animate-pulse rounded" />
                        </CardHeader>
                        <CardContent>
                            <div className="h-8 w-16 bg-muted animate-pulse rounded" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {statCards.map((stat) => {
                const Icon = stat.icon;
                return (
                    <Card key={stat.title}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                {stat.title}
                            </CardTitle>
                            <div className={`p-2.5 rounded-xl ${stat.bgColor} border border-white/20 shadow-sm`}>
                                <Icon className={`h-5 w-5 ${stat.color}`} fill="currentColor" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stat.value}</div>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}
