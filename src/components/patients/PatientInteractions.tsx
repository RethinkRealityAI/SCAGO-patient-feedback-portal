'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, Plus, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { addInteraction } from '@/app/patients/actions';
import { interactionSchema, PatientInteraction, INTERACTION_TYPES } from '@/types/patient';
import { cn } from '@/lib/utils';

interface PatientInteractionsProps {
    patientId: string;
    interactions: PatientInteraction[];
    onUpdate: () => void;
}

export function PatientInteractions({ patientId, interactions, onUpdate }: PatientInteractionsProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const form = useForm<PatientInteraction>({
        resolver: zodResolver(interactionSchema),
        defaultValues: {
            patientId: patientId,
            date: new Date(),
            type: 'phone_call',
            notes: '',
            outcome: '',
        },
    });

    const onSubmit = async (data: PatientInteraction) => {
        setIsLoading(true);
        try {
            // Ensure patientId is set
            data.patientId = patientId;

            const result = await addInteraction(data);

            if (result.success) {
                toast({
                    title: 'Interaction Logged',
                    description: 'The interaction has been successfully recorded.',
                });
                setIsOpen(false);
                form.reset({
                    patientId: patientId,
                    date: new Date(),
                    type: 'phone_call',
                    notes: '',
                    outcome: '',
                });
                onUpdate();
            } else {
                toast({
                    title: 'Error',
                    description: result.error || 'Failed to log interaction',
                    variant: 'destructive',
                });
            }
        } catch (error) {
            console.error('Error logging interaction:', error);
            toast({
                title: 'Error',
                description: 'An unexpected error occurred',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Sort interactions by date descending
    const sortedInteractions = [...interactions].sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    return (
        <Card className="h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="space-y-1">
                    <CardTitle>Interaction History</CardTitle>
                    <CardDescription>
                        Log of all communications and updates.
                    </CardDescription>
                </div>
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm">
                            <Plus className="mr-2 h-4 w-4" />
                            Log Interaction
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Log Interaction</DialogTitle>
                            <DialogDescription>
                                Record a new interaction with the patient.
                            </DialogDescription>
                        </DialogHeader>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="date"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Date *</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="date"
                                                    value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''}
                                                    onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="type"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Type *</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select type" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {INTERACTION_TYPES.map((type) => (
                                                        <SelectItem key={type} value={type}>
                                                            {type.charAt(0).toUpperCase() + type.slice(1)}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="notes"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Notes *</FormLabel>
                                            <FormControl>
                                                <Textarea {...field} placeholder="Details of the interaction..." />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="outcome"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Outcome / Next Steps</FormLabel>
                                            <FormControl>
                                                <Input {...field} placeholder="e.g. Follow up in 2 weeks" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="flex justify-end gap-2 pt-4">
                                    <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                                        Cancel
                                    </Button>
                                    <Button type="submit" disabled={isLoading}>
                                        {isLoading ? 'Saving...' : 'Save Log'}
                                    </Button>
                                </div>
                            </form>
                        </Form>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent className="flex-1 min-h-0">
                <ScrollArea className="h-[500px] pr-4">
                    {sortedInteractions.length === 0 ? (
                        <div className="text-center text-muted-foreground py-8">
                            No interactions recorded yet.
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {sortedInteractions.map((interaction, index) => (
                                <div key={interaction.id || index} className="relative pl-6 pb-6 border-l last:pb-0 last:border-l-0">
                                    <div className="absolute left-[-5px] top-0 h-2.5 w-2.5 rounded-full bg-primary" />
                                    <div className="flex flex-col space-y-1">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-semibold text-primary capitalize">
                                                {interaction.type}
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                {format(new Date(interaction.date), 'PPP')}
                                            </span>
                                        </div>
                                        <p className="text-sm text-foreground whitespace-pre-wrap">
                                            {interaction.notes}
                                        </p>
                                        {interaction.outcome && (
                                            <p className="text-xs text-muted-foreground mt-1 italic">
                                                Outcome: {interaction.outcome}
                                            </p>
                                        )}
                                        <div className="text-xs text-muted-foreground pt-1">
                                            Logged by: {interaction.createdBy}
                                        </div>
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
