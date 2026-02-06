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
    const { isSuperAdmin } = useAuth();
    const [pinnedIds, setPinnedIds] = useState<string[]>([]);
    const [globalHiddenIds, setGlobalHiddenIds] = useState<string[]>([]);
    const { toast } = useToast();

    useEffect(() => {
        // Load local pins
        const savedPins = localStorage.getItem('scago_navbar_pins');
        if (savedPins) {
            try {
                setPinnedIds(JSON.parse(savedPins));
            } catch (e) {
                console.error('Failed to parse navbar pins', e);
            }
        }

        // Load global visibility settings
        const loadGlobalSettings = async () => {
            try {
                const docRef = doc(db, 'config', 'navigation');
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    if (data.hiddenIds && Array.isArray(data.hiddenIds)) {
                        setGlobalHiddenIds(data.hiddenIds);
                    }
                }
            } catch (e) {
                console.warn('Failed to load global nav settings', e);
            }
        };

        if (isSuperAdmin) {
            // Only need to load for admin UI purposes, but actually we show "Hidden Globally" badge to regular users too?
            // Yes, checking if it's hidden globally is useful context.
            // But wait, regular users simply WON'T SEE IT in useUserNavigation if checks pass.
            // In this Customization UI, we probably only want to show it if isSuperAdmin?
            // Actually, regular users can pin/unpin things they HAVE access to.
            // If something is globally hidden, they shouldn't even see it in allNavItems.
            // So logic in useUserNavigation handles the filtering.
            // But for SuperAdmin, they see EVERYTHING in allNavItems (if permission checks pass).
            // So they need to see what is hidden globally.
            loadGlobalSettings();
        }

        // Even for non-super admins, we might want to know if some items are hidden? 
        // But allNavItems comes from useUserNavigation which presumably WILL FILTER them out.
        // So items in allNavItems are by definition NOT hidden for this user?
        // Except if useUserNavigation hasn't been updated yet.
        // Let's just load it.
        loadGlobalSettings();
    }, [isSuperAdmin]);

    const toggleGlobalVisibility = async (id: string) => {
        if (!isSuperAdmin) return;

        let newHiddenIds: string[];
        if (globalHiddenIds.includes(id)) {
            newHiddenIds = globalHiddenIds.filter(hid => hid !== id);
        } else {
            newHiddenIds = [...globalHiddenIds, id];
        }

        setGlobalHiddenIds(newHiddenIds);

        try {
            await setDoc(doc(db, 'config', 'navigation'), {
                hiddenIds: newHiddenIds,
                updatedAt: new Date(),
                updatedBy: 'admin' // In real app, put user email
            }, { merge: true });

            toast({
                title: "Global settings updated",
                description: `Navigation item is now ${newHiddenIds.includes(id) ? 'hidden' : 'visible'} for everyone.`,
            });
        } catch (e) {
            console.error('Failed to save global nav settings', e);
            toast({
                title: "Error",
                description: "Failed to save settings.",
                variant: 'destructive',
            });
            // Revert on error
            setGlobalHiddenIds(globalHiddenIds);
        }
    };

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
                    Navigation Customization
                </CardTitle>
                <CardDescription>
                    Customize your personal navigation bar. {isSuperAdmin && "Super Admins can also configure global visibility."}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid gap-3">
                    {allNavItems.map((item) => {
                        const isPinned = pinnedIds.includes(item.id);
                        const isGloballyHidden = globalHiddenIds.includes(item.id);

                        return (
                            <div
                                key={item.id}
                                className={cn(
                                    "flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border transition-all duration-300 gap-3",
                                    isPinned
                                        ? "bg-primary/5 border-primary/20 shadow-sm"
                                        : "bg-background border-border",
                                    isGloballyHidden && "opacity-75 bg-muted/30"
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
                                        <div className="flex items-center gap-2">
                                            <p className="font-medium text-sm">{item.label}</p>
                                            {isGloballyHidden && (
                                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-medium border border-border">
                                                    Hidden Globally
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground">{item.href}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 self-end sm:self-auto">
                                    {isSuperAdmin && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => toggleGlobalVisibility(item.id)}
                                            className="h-8 text-xs gap-1.5"
                                            title={isGloballyHidden ? "Show for everyone" : "Hide for everyone"}
                                        >
                                            {isGloballyHidden ? (
                                                <>
                                                    <Eye className="h-3.5 w-3.5" />
                                                    Show
                                                </>
                                            ) : (
                                                <>
                                                    <EyeOff className="h-3.5 w-3.5" />
                                                    Hide
                                                </>
                                            )}
                                        </Button>
                                    )}

                                    <Button
                                        variant={isPinned ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => togglePin(item.id)}
                                        className="h-8 text-xs gap-1.5 min-w-[80px]"
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

// Add Eye icons import
import { Eye, EyeOff } from 'lucide-react';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useAuth } from '@/hooks/use-auth';
