'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, Plus, MessageSquare, CheckCircle2, User, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { addInteraction, updateInteraction, deleteInteraction } from '@/app/patients/actions';
import { interactionSchema, PatientInteraction, INTERACTION_TYPES, SUPPORT_TYPES } from '@/types/patient';
import { cn } from '@/lib/utils';

interface PatientInteractionsProps {
    patientId: string;
    interactions: PatientInteraction[];
    onUpdate: () => void;
}

export function PatientInteractions({ patientId, interactions, onUpdate }: PatientInteractionsProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [editingInteraction, setEditingInteraction] = useState<PatientInteraction | null>(null);
    const { toast } = useToast();

    const form = useForm<PatientInteraction>({
        resolver: zodResolver(interactionSchema),
        defaultValues: {
            patientId: patientId,
            date: new Date(),
            type: 'phone_call',
            category: 'Hemoglobinopathy Clinic',
            supportTypes: [],
            notes: '',
            outcome: '',
        },
    });

    const handleOpenChange = (open: boolean) => {
        setIsOpen(open);
        if (!open) {
            setEditingInteraction(null);
            form.reset({
                patientId: patientId,
                date: new Date(),
                type: 'phone_call',
                category: 'Hemoglobinopathy Clinic',
                supportTypes: [],
                notes: '',
                outcome: '',
            });
        }
    };

    const onEdit = (interaction: PatientInteraction) => {
        setEditingInteraction(interaction);
        form.reset({
            ...interaction,
            date: new Date(interaction.date),
        });
        setIsOpen(true);
    };

    const onDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this interaction log?')) return;

        setIsLoading(true);
        try {
            const result = await deleteInteraction(id, patientId);
            if (result.success) {
                toast({
                    title: 'Interaction Deleted',
                    description: 'The log has been removed.',
                });
                onUpdate();
            } else {
                toast({
                    title: 'Error',
                    description: result.error || 'Failed to delete interaction',
                    variant: 'destructive',
                });
            }
        } catch (error) {
            console.error('Error deleting interaction:', error);
            toast({
                title: 'Error',
                description: 'Failed to delete interaction',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const onSubmit = async (data: PatientInteraction) => {
        setIsLoading(true);
        try {
            data.patientId = patientId;

            let result;
            if (editingInteraction?.id) {
                result = await updateInteraction(editingInteraction.id, data);
            } else {
                result = await addInteraction(data);
            }

            if (result.success) {
                toast({
                    title: editingInteraction ? 'Interaction Updated' : 'Interaction Logged',
                    description: editingInteraction
                        ? 'The interaction record has been updated.'
                        : 'The interaction has been successfully recorded.',
                });
                handleOpenChange(false);
                onUpdate();
            } else {
                toast({
                    title: 'Error',
                    description: result.error || 'Failed to save interaction',
                    variant: 'destructive',
                });
            }
        } catch (error) {
            console.error('Error saving interaction:', error);
            toast({
                title: 'Error',
                description: 'An unexpected error occurred',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Sort interactions by date descending (client-side sorting since server-side ordering was removed for stability)
    const sortedInteractions = [...(interactions || [])].sort((a, b) => {
        const dateA = a?.date ? new Date(a.date).getTime() : 0;
        const dateB = b?.date ? new Date(b.date).getTime() : 0;
        return dateB - dateA;
    });

    return (
        <Card className="h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="space-y-1">
                    <CardTitle>Interaction History</CardTitle>
                    <CardDescription>
                        Log of all communications and updates.
                    </CardDescription>
                </div>
                <Dialog open={isOpen} onOpenChange={handleOpenChange}>
                    <DialogTrigger asChild>
                        <Button size="sm">
                            <Plus className="mr-2 h-4 w-4" />
                            Log Interaction
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[900px]">
                        <DialogHeader>
                            <DialogTitle>{editingInteraction ? 'Edit Interaction' : 'Log Interaction'}</DialogTitle>
                            <DialogDescription>
                                {editingInteraction ? 'Update the details of this interaction.' : 'Record a new interaction with the patient.'}
                            </DialogDescription>
                        </DialogHeader>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                                    {/* Left Column: Metadata */}
                                    <div className="md:col-span-5 space-y-4">
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
                                                    <FormLabel>Interaction Method *</FormLabel>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select type" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            {INTERACTION_TYPES.map((type) => (
                                                                <SelectItem key={type} value={type}>
                                                                    {type.replace(/_/g, ' ').charAt(0).toUpperCase() + type.replace(/_/g, ' ').slice(1)}
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
                                            name="category"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Location / Category *</FormLabel>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select category" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            {['Hemoglobinopathy Clinic', 'ER / ED', 'Inpatient / Admission', 'Outpatient', 'Community Outbound', 'Other'].map((cat) => (
                                                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
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
                                    </div>

                                    {/* Right Column: Support Types */}
                                    <div className="md:col-span-7 flex flex-col h-full">
                                        <FormLabel className="mb-3">Types of Support Provided</FormLabel>
                                        <div className="flex-1 min-h-[250px] md:max-h-[320px] bg-muted/30 p-4 rounded-md border overflow-y-auto">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                                                {SUPPORT_TYPES.map((type) => (
                                                    <div key={type} className="flex items-center justify-between space-x-2 border-b border-muted py-2 hover:bg-muted/40 transition-colors">
                                                        <span className="text-[13px] leading-tight font-medium text-foreground/80">{type}</span>
                                                        <Switch
                                                            checked={form.watch('supportTypes')?.includes(type)}
                                                            onCheckedChange={(checked) => {
                                                                const current = form.getValues('supportTypes') || [];
                                                                if (checked) {
                                                                    form.setValue('supportTypes', [...current, type]);
                                                                } else {
                                                                    form.setValue('supportTypes', current.filter((t: string) => t !== type));
                                                                }
                                                            }}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Full Width Bottom: Notes */}
                                <FormField
                                    control={form.control}
                                    name="notes"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Notes *</FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    {...field}
                                                    placeholder="Details of the interaction..."
                                                    className="min-h-[100px] bg-background"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="flex justify-end gap-2 pt-2">
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
                <ScrollArea className="h-[580px] pr-4">
                    {sortedInteractions.length === 0 ? (
                        <div className="text-center text-muted-foreground py-8">
                            No interactions recorded yet.
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {sortedInteractions.map((interaction, index) => {
                                if (!interaction) return null;
                                const date = interaction.date ? new Date(interaction.date) : null;
                                const typeLabel = (interaction.type || 'interaction').replace(/_/g, ' ');

                                return (
                                    <div key={interaction.id || index} className="relative pl-6 pb-6 border-l last:pb-0 last:border-l-0">
                                        <div className="absolute left-[-5px] top-0 h-2.5 w-2.5 rounded-full bg-primary" />
                                        <div className="flex flex-col space-y-1">
                                            <div className="flex items-start justify-between">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-semibold text-primary capitalize">
                                                        {typeLabel}
                                                    </span>
                                                    <span className="text-xs font-semibold text-muted-foreground">
                                                        {interaction.category || 'General'}
                                                    </span>
                                                </div>
                                                <div className="flex items-start gap-4">
                                                    <span className="text-xs text-muted-foreground pt-1">
                                                        {date ? format(date, 'PPP') : 'No Date'}
                                                    </span>
                                                    <div className="flex gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7 text-muted-foreground hover:text-primary"
                                                            onClick={() => onEdit(interaction)}
                                                        >
                                                            <Pencil className="h-3.5 w-3.5" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                                            onClick={() => interaction.id && onDelete(interaction.id)}
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                            <p className="text-sm text-foreground whitespace-pre-wrap mt-1">
                                                {interaction.notes || 'No notes provided.'}
                                            </p>
                                            {interaction.supportTypes && interaction.supportTypes.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mt-2">
                                                    {interaction.supportTypes.map((type) => (
                                                        <Badge key={type} variant="secondary" className="text-[10px] py-0 px-1.5 h-4">
                                                            {type}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            )}
                                            {interaction.outcome && (
                                                <p className="text-xs text-muted-foreground mt-2 italic flex items-center gap-1">
                                                    <CheckCircle2 className="h-3 w-3" /> Outcome: {interaction.outcome}
                                                </p>
                                            )}
                                            <div className="text-xs text-muted-foreground pt-1 flex items-center gap-1">
                                                <User className="h-3 w-3" /> Logged by: {interaction.createdBy}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </ScrollArea>
            </CardContent>
        </Card>
    );
}
