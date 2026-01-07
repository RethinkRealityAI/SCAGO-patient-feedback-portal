'use client';

import { format } from 'date-fns';
import { Calendar, FileText, User, Edit, Trash2, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

interface TimelineEvent {
    id: string;
    type: 'created' | 'updated' | 'interaction_added' | 'document_uploaded' | 'status_changed';
    description: string;
    performedBy?: string;
    createdAt: Date;
    metadata?: any;
}

interface PatientTimelineProps {
    patientId: string;
    events: TimelineEvent[];
}

export function PatientTimeline({ patientId, events }: PatientTimelineProps) {
    const getEventIcon = (type: TimelineEvent['type']) => {
        switch (type) {
            case 'created':
                return <User className="h-4 w-4" />;
            case 'updated':
                return <Edit className="h-4 w-4" />;
            case 'interaction_added':
                return <Calendar className="h-4 w-4" />;
            case 'document_uploaded':
                return <FileText className="h-4 w-4" />;
            case 'status_changed':
                return <CheckCircle2 className="h-4 w-4" />;
            default:
                return <Calendar className="h-4 w-4" />;
        }
    };

    const getEventColor = (type: TimelineEvent['type']) => {
        switch (type) {
            case 'created':
                return 'bg-blue-500';
            case 'updated':
                return 'bg-purple-500';
            case 'interaction_added':
                return 'bg-green-500';
            case 'document_uploaded':
                return 'bg-amber-500';
            case 'status_changed':
                return 'bg-red-500';
            default:
                return 'bg-gray-500';
        }
    };

    const sortedEvents = [...events].sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle>Activity Timeline</CardTitle>
                <CardDescription>
                    Complete history of all patient activities
                </CardDescription>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[500px] pr-4">
                    {sortedEvents.length === 0 ? (
                        <div className="text-center text-muted-foreground py-8">
                            No activity recorded yet
                        </div>
                    ) : (
                        <div className="relative space-y-4">
                            {/* Timeline line */}
                            <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-border" />

                            {sortedEvents.map((event, index) => (
                                <div key={event.id} className="relative flex gap-4">
                                    {/* Icon */}
                                    <div className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full ${getEventColor(event.type)} text-white`}>
                                        {getEventIcon(event.type)}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 space-y-1 pb-4">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-medium leading-none">
                                                {event.description}
                                            </p>
                                            <Badge variant="outline" className="text-xs">
                                                {event.type.replace(/_/g, ' ')}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <span>{format(new Date(event.createdAt), 'MMM d, yyyy h:mm a')}</span>
                                            {event.performedBy && (
                                                <>
                                                    <span>•</span>
                                                    <span>by {event.performedBy}</span>
                                                </>
                                            )}
                                        </div>
                                        {event.metadata && (
                                            <div className="text-xs text-muted-foreground mt-1">
                                                {JSON.stringify(event.metadata, null, 2)}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </CardContent>
        </Card>
    );
}
