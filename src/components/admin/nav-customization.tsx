'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useUserNavigation, NavItem } from '@/hooks/use-user-navigation';
import { Check, Pin, PinOff, GripVertical } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export function NavCustomization() {
    const allNavItems = useUserNavigation();
    const [pinnedIds, setPinnedIds] = useState<string[]>([]);
    const { toast } = useToast();

    useEffect(() => {
        const savedPins = localStorage.getItem('scago_navbar_pins');
        if (savedPins) {
            try {
                setPinnedIds(JSON.parse(savedPins));
            } catch (e) {
                console.error('Failed to parse navbar pins', e);
            }
        }
    }, []);

    const togglePin = (id: string) => {
        let newPinnedIds: string[];
        if (pinnedIds.includes(id)) {
            newPinnedIds = pinnedIds.filter(pid => pid !== id);
        } else {
            newPinnedIds = [...pinnedIds, id];
        }

        setPinnedIds(newPinnedIds);
        localStorage.setItem('scago_navbar_pins', JSON.stringify(newPinnedIds));

        toast({
            title: "Navbar updated",
            description: "Your pinned items have been saved locally.",
        });

        // Dispatch a storage event to update other tabs/header
        window.dispatchEvent(new Event('storage'));
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Pin className="h-5 w-5 text-primary" />
                    Navigation Pinning
                </CardTitle>
                <CardDescription>
                    Choose which items should be pinned to the main navbar. Unpinned items will move to the "More" menu.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid gap-3">
                    {allNavItems.map((item) => {
                        const isPinned = pinnedIds.includes(item.id);
                        return (
                            <div
                                key={item.id}
                                className={cn(
                                    "flex items-center justify-between p-3 rounded-xl border transition-all duration-300",
                                    isPinned
                                        ? "bg-primary/5 border-primary/20 shadow-sm"
                                        : "bg-background border-border"
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "p-2 rounded-lg",
                                        isPinned ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                                    )}>
                                        {item.icon}
                                    </div>
                                    <div>
                                        <p className="font-medium text-sm">{item.label}</p>
                                        <p className="text-xs text-muted-foreground">{item.href}</p>
                                    </div>
                                </div>

                                <Button
                                    variant={isPinned ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => togglePin(item.id)}
                                    className="rounded-lg gap-2"
                                >
                                    {isPinned ? (
                                        <>
                                            <PinOff className="h-3.5 w-3.5" />
                                            Unpin
                                        </>
                                    ) : (
                                        <>
                                            <Pin className="h-3.5 w-3.5" />
                                            Pin
                                        </>
                                    )}
                                </Button>
                            </div>
                        );
                    })}
                </div>

                {pinnedIds.length === 0 && (
                    <p className="text-xs text-muted-foreground mt-4 italic">
                        No items pinned. Using system defaults (first 5 available items).
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
