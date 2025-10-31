'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield, 
  Mail, 
  LogOut, 
  Key,
  Clock,
  Info
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { signOut } from '@/lib/firebase-auth';
import { resendYEPInvite } from '@/app/youth-empowerment/invite-actions';
import { YEPParticipant, YEPMentor } from '@/lib/youth-empowerment';

interface ProfileSecurityProps {
  user: {
    uid: string;
    email: string | null;
  };
  profile: YEPParticipant | YEPMentor;
}

export function ProfileSecurity({ user, profile }: ProfileSecurityProps) {
  const [isResending, setIsResending] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handleResendLink = async () => {
    if (!user.email) return;

    setIsResending(true);
    try {
      const result = await resendYEPInvite(user.email);

      if (result.success) {
        toast({
          title: 'Email Sent',
          description: 'A new sign-in link has been sent to your email',
        });
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to send email',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error resending link:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsResending(false);
    }
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
      toast({
        title: 'Error',
        description: 'Failed to sign out',
        variant: 'destructive',
      });
      setIsSigningOut(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Account Security
          </CardTitle>
          <CardDescription>
            Manage your account security and sign-in options
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Account Info */}
          <div className="space-y-4">
            <h4 className="font-medium">Account Information</h4>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Email Address</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
              </div>

              {profile.lastLoginAt && (
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Last Login</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(profile.lastLoginAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Password/Sign-in Management */}
          <div className="space-y-4">
            <h4 className="font-medium">Sign-In Method</h4>
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Your account uses passwordless sign-in. You receive a secure link via email to access your account.
              </AlertDescription>
            </Alert>

            <Button
              onClick={handleResendLink}
              disabled={isResending}
              variant="outline"
              className="w-full"
            >
              {isResending ? (
                <>
                  <Mail className="mr-2 h-4 w-4 animate-pulse" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Request New Sign-In Link
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              A secure link will be sent to {user.email}
            </p>
          </div>

          {/* Sign Out */}
          <div className="space-y-4 pt-4 border-t">
            <h4 className="font-medium">Sign Out</h4>
            <Button
              onClick={handleSignOut}
              disabled={isSigningOut}
              variant="destructive"
              className="w-full"
            >
              {isSigningOut ? (
                <>
                  <LogOut className="mr-2 h-4 w-4 animate-pulse" />
                  Signing out...
                </>
              ) : (
                <>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </>
              )}
            </Button>
          </div>

          {/* Help Section */}
          <div className="space-y-2 pt-4 border-t">
            <h4 className="font-medium">Need Help?</h4>
            <p className="text-sm text-muted-foreground">
              If you're having trouble accessing your account or need to update your email address,
              please contact your program administrator.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}






