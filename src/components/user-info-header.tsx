'use client';

import { useContext } from 'react';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { AuthContext } from '@/components/auth/auth-provider';
import { signOut } from '@/lib/firebase-auth';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

export function UserInfoHeader() {
  const { user } = useContext(AuthContext);
  const router = useRouter();
  const { toast } = useToast();

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

  if (!user) return null;

  return (
    <div className="flex items-center gap-3">
      <p className="text-sm text-muted-foreground hidden sm:inline">
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
    </div>
  );
}

