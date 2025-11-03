'use client';

import Link from 'next/link';
import { HeartPulse, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter, usePathname } from 'next/navigation';
import { AuthContext } from '@/components/auth/auth-provider';
import { signOut } from '@/lib/firebase-auth';
import { useToast } from '@/hooks/use-toast';
import { useContext } from 'react';
import { useUserNavigation } from '@/hooks/use-user-navigation';
import { cn } from '@/lib/utils';

export default function Header() {
  const { user } = useContext(AuthContext);
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const navItems = useUserNavigation();

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

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/30 bg-background/20 backdrop-blur-xl mobile-glass">
      <div className="container flex h-16 items-center px-4 sm:px-6">
        <div className="mr-4 flex items-center">
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="p-2 rounded-lg bg-primary/10 backdrop-blur-sm border border-primary/20 group-hover:bg-primary/20 transition-all duration-300">
              <HeartPulse className="h-5 w-5 text-primary" />
            </div>
            <span className="font-bold text-lg bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              {portalName}
            </span>
          </Link>
        </div>
        <nav className="flex flex-1 items-center justify-end gap-2">
          {user && navItems.length > 0 && (
            <div className="hidden md:flex items-center gap-1 mr-2 border-r pr-2 border-border/30">
              {navItems.map((item) => {
                const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                    )}
                  >
                    {item.icon}
                    <span className="hidden lg:inline">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          )}
          {user?.email && (
            <>
              <p className="text-sm text-muted-foreground hidden lg:inline">
                Signed in as <span className="font-medium">{user.email}</span>
              </p>
              <Button
                variant="default"
                size="sm"
                onClick={handleSignOut}
              >
                <LogOut className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Sign Out</span>
                <span className="sm:hidden">Out</span>
              </Button>
            </>
          )}
          {!user && (
            <Button variant="outline" size="sm" asChild>
              <Link href="/login">Sign In</Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
