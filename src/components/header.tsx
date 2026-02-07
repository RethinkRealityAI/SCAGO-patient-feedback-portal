'use client';

import Link from 'next/link';
import { HeartPulse, LogOut, Menu, MoreHorizontal, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter, usePathname } from 'next/navigation';
import { AuthContext } from '@/components/auth/auth-provider';
import { signOut } from '@/lib/firebase-auth';
import { useToast } from '@/hooks/use-toast';
import { useContext, useState, useEffect, useCallback } from 'react';
import React from 'react';
import { useUserNavigation, NavItem } from '@/hooks/use-user-navigation';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Header() {
  const { user } = useContext(AuthContext);
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const allNavItems = useUserNavigation();
  // Filter out globally hidden items
  const navItems = allNavItems.filter(item => !item.isGloballyHidden);
  const [isOpen, setIsOpen] = useState(false);
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);

  // Load pinned items from localStorage
  useEffect(() => {
    const loadPins = () => {
      const savedPins = localStorage.getItem('scago_navbar_pins');
      if (savedPins) {
        try {
          setPinnedIds(JSON.parse(savedPins));
        } catch (e) {
          console.error('Failed to parse navbar pins', e);
        }
      } else {
        setPinnedIds([]);
      }
    };

    loadPins();

    // Listen for storage changes (for multiple tabs) or custom storage event (same tab)
    window.addEventListener('storage', loadPins);
    return () => window.removeEventListener('storage', loadPins);
  }, []);

  // Dynamic threshold based on window width
  const [threshold, setThreshold] = useState(5);

  useEffect(() => {
    const updateThreshold = () => {
      const width = window.innerWidth;
      if (width >= 1800) setThreshold(15);
      else if (width >= 1536) setThreshold(9);
      else if (width >= 1350) setThreshold(7);
      else if (width >= 1200) setThreshold(6);
      else setThreshold(5);
    };

    updateThreshold();
    window.addEventListener('resize', updateThreshold);
    return () => window.removeEventListener('resize', updateThreshold);
  }, []);

  // Check if we're on the profile page to show "YEP Portal" instead
  const isProfilePage = pathname?.startsWith('/profile');
  const portalName = isProfilePage ? 'YEP Portal' : 'SCAGO Portal';

  const handleSignOut = async () => {
    const result = await signOut();
    if (result.error) {
      toast({
        title: 'Sign out failed',
        description: result.error,
        variant: 'destructive',
      });
    } else {
      toast({ title: 'Signed out' });
      router.push('/login');
    }
  };

  // Logic to split nav items based on pins vs threshold
  let visibleItems: NavItem[] = [];
  let overflowItems: NavItem[] = [];

  if (pinnedIds.length > 0) {
    // Show pinned items first (respecting user preference)
    const availablePinned = navItems.filter(item => pinnedIds.includes(item.id));
    const sortedPinned = [...availablePinned].sort((a, b) =>
      pinnedIds.indexOf(a.id) - pinnedIds.indexOf(b.id)
    );

    // Fill up remaining threshold slots with non-pinned items if any
    const nonPinned = navItems.filter(item => !pinnedIds.includes(item.id));
    const remainingSlots = Math.max(0, threshold - sortedPinned.length);

    visibleItems = [...sortedPinned, ...nonPinned.slice(0, remainingSlots)];
    overflowItems = nonPinned.slice(remainingSlots);
  } else {
    visibleItems = navItems.slice(0, threshold);
    overflowItems = navItems.slice(threshold);
  }

  const NavLink = ({ item, onClick, className, showLabel = true }: { item: NavItem, onClick?: () => void, className?: string, showLabel?: boolean }) => {
    const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
    return (
      <Link
        href={item.href}
        onClick={onClick}
        className={cn(
          "flex items-center gap-1.5 xl:gap-2 px-2.5 xl:px-3 py-2 rounded-xl text-[11px] xl:text-xs 2xl:text-sm font-medium transition-all duration-300 relative group shrink-0",
          isActive
            ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25 scale-105"
            : "text-muted-foreground hover:text-foreground hover:bg-white/10 dark:hover:bg-white/5",
          className
        )}
      >
        <span className={cn("transition-transform duration-300 group-hover:scale-110", isActive ? "" : "text-primary/70")}>
          {item.icon && React.cloneElement(item.icon as React.ReactElement, {
            className: cn((item.icon as any).props.className, "h-3.5 w-3.5 xl:h-4 xl:w-4")
          })}
        </span>
        {showLabel && <span className="truncate max-w-[80px] xl:max-w-[120px] 2xl:max-w-none">{item.label}</span>}
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-50 w-full px-4 pt-4 lg:pt-6 pb-2 pointer-events-none">
      <div className="mx-auto max-w-7xl pointer-events-auto">
        <div className="glass-premium rounded-2xl transition-all duration-500 hover:shadow-primary/5">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6">
            <div className="flex items-center gap-4 lg:gap-8">
              <Link href="/" className="flex items-center space-x-3 group">
                <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 backdrop-blur-md border border-primary/20 group-hover:from-primary/30 group-hover:to-primary/10 transition-all duration-500 shadow-sm group-hover:shadow-primary/20 group-hover:scale-105 active:scale-95">
                  <HeartPulse className="h-6 w-6 text-primary animate-pulse-subtle" />
                </div>
                <div className="flex flex-col -space-y-1">
                  <span className="font-extrabold text-xl bg-gradient-to-r from-primary via-primary/80 to-secondary bg-clip-text text-transparent drop-shadow-sm">
                    {portalName}
                  </span>
                </div>
              </Link>

              {/* Desktop Navigation */}
              {user && navItems.length > 0 && (
                <nav className="hidden lg:flex items-center gap-1 border-l border-border/30 pl-4 lg:pl-8">
                  {visibleItems.map((item) => (
                    <NavLink key={item.href} item={item} />
                  ))}

                  {overflowItems.length > 0 && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-9 px-3 gap-2 text-muted-foreground hover:text-foreground rounded-xl hover:bg-white/10 dark:hover:bg-white/5">
                          <MoreHorizontal className="h-4 w-4 text-primary/70" />
                          <span className="hidden xl:inline">More</span>
                          <ChevronDown className="h-3 w-3 opacity-50" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56 p-2 glass-premium border-border/50 shadow-2xl rounded-2xl backdrop-blur-3xl">
                        {overflowItems.map((item) => {
                          const isItemActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                          return (
                            <DropdownMenuItem key={item.href} asChild>
                              <Link
                                href={item.href}
                                className={cn(
                                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer",
                                  isItemActive ? "bg-primary/10 text-primary" : "hover:bg-white/10 dark:hover:bg-white/5"
                                )}
                              >
                                <span className="text-primary/70">{item.icon}</span>
                                {item.label}
                              </Link>
                            </DropdownMenuItem>
                          );
                        })}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </nav>
              )}
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
              {user?.email && (
                <div className="hidden min-[1150px]:flex flex-col items-end mr-4">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-tighter">Portal Session</span>
                  <span className="text-xs font-bold truncate max-w-[150px] opacity-80">{user.email}</span>
                </div>
              )}

              <div className="flex items-center gap-2">
                {user && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleSignOut}
                    className="rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors h-10 w-10"
                    title="Sign Out"
                  >
                    <LogOut className="h-5 w-5" />
                  </Button>
                )}

                {!user && (
                  <Button variant="default" size="sm" className="rounded-xl px-6 shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all" asChild>
                    <Link href="/login">Sign In</Link>
                  </Button>
                )}

                {/* Mobile/Tablet Menu Button */}
                {user && (
                  <Sheet open={isOpen} onOpenChange={setIsOpen}>
                    <SheetTrigger asChild>
                      <Button variant="ghost" size="icon" className="lg:hidden rounded-full h-10 w-10 border border-border/50 bg-white/5 backdrop-blur-sm">
                        <Menu className="h-5 w-5" />
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="right" className="p-0 glass-premium border-l border-border/50 w-[85%] sm:max-w-md">
                      <div className="flex flex-col h-full">
                        <SheetHeader className="p-6 border-b border-border/30">
                          <SheetTitle className="text-left flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
                              <HeartPulse className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-lg font-bold">{portalName}</span>
                              <span className="text-[10px] font-medium text-muted-foreground uppercase">Navigation Menu</span>
                            </div>
                          </SheetTitle>
                        </SheetHeader>

                        <div className="flex-1 overflow-y-auto p-6 space-y-3">
                          {navItems.map((item) => (
                            <NavLink
                              key={item.href}
                              item={item}
                              className="w-full justify-start py-4 px-5 text-base rounded-2xl"
                              onClick={() => setIsOpen(false)}
                            />
                          ))}
                        </div>

                        <div className="p-8 border-t border-border/30 bg-primary/5 backdrop-blur-md">
                          {user?.email && (
                            <div className="mb-6 flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/10 text-ellipsis overflow-hidden">
                              <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold shrink-0">
                                {user.email[0].toUpperCase()}
                              </div>
                              <div className="overflow-hidden">
                                <p className="text-[10px] text-muted-foreground uppercase font-bold">Authenticated User</p>
                                <p className="text-sm font-bold text-foreground truncate">{user.email}</p>
                              </div>
                            </div>
                          )}
                          <Button
                            variant="destructive"
                            className="w-full justify-center gap-3 rounded-2xl h-14 font-bold shadow-xl shadow-destructive/20 active:scale-95 transition-all"
                            onClick={() => {
                              handleSignOut();
                              setIsOpen(false);
                            }}
                          >
                            <LogOut className="h-5 w-5" />
                            Sign Out of Portal
                          </Button>
                        </div>
                      </div>
                    </SheetContent>
                  </Sheet>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
