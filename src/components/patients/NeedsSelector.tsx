'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, X } from 'lucide-react';
import { useState } from 'react';
import { PATIENT_NEEDS } from '@/types/patient';

interface NeedsSelectorProps {
    selectedNeeds: string[];
    onChange: (needs: string[]) => void;
}

export function NeedsSelector({ selectedNeeds, onChange }: NeedsSelectorProps) {
    const [customNeed, setCustomNeed] = useState('');

    const handleToggleNeed = (need: string) => {
        if (selectedNeeds.includes(need)) {
            onChange(selectedNeeds.filter(n => n !== need));
        } else {
            onChange([...selectedNeeds, need]);
        }
    };

    const handleAddCustomNeed = () => {
        if (customNeed.trim() && !selectedNeeds.includes(customNeed.trim())) {
            onChange([...selectedNeeds, customNeed.trim()]);
            setCustomNeed('');
        }
    };

    const handleRemoveCustomNeed = (need: string) => {
        onChange(selectedNeeds.filter(n => n !== need));
    };

    const predefinedNeeds = PATIENT_NEEDS.filter(need => selectedNeeds.includes(need));
    const customNeeds = selectedNeeds.filter(need => !PATIENT_NEEDS.includes(need as any));

    return (
        <Card>
            <CardHeader>
                <CardTitle>Patient Needs</CardTitle>
                <CardDescription>
                    Select all applicable needs for this patient
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Predefined Needs Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {PATIENT_NEEDS.map((need) => (
                        <div key={need} className="flex items-center space-x-2">
                            <Checkbox
                                id={need}
                                checked={selectedNeeds.includes(need)}
                                onCheckedChange={() => handleToggleNeed(need)}
                            />
                            <Label
                                htmlFor={need}
                                className="text-sm font-normal cursor-pointer capitalize"
                            >
                                {need.replace(/_/g, ' ')}
                            </Label>
                        </div>
                    ))}
                </div>

                {/* Custom Needs */}
                {customNeeds.length > 0 && (
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">Custom Needs</Label>
                        <div className="flex flex-wrap gap-2">
                            {customNeeds.map((need) => (
                                <div
                                    key={need}
                                    className="flex items-center gap-1 bg-secondary text-secondary-foreground px-3 py-1 rounded-md text-sm"
                                >
                                    <span>{need}</span>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-4 w-4 p-0 hover:bg-transparent"
                                        onClick={() => handleRemoveCustomNeed(need)}
                                    >
                                        <X className="h-3 w-3" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Add Custom Need */}
                <div className="flex gap-2">
                    <Input
                        placeholder="Add custom need..."
                        value={customNeed}
                        onChange={(e) => setCustomNeed(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleAddCustomNeed()}
                    />
                    <Button onClick={handleAddCustomNeed} size="icon" variant="outline">
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
