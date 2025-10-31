'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Loader2,
  User,
  FileText,
  Shield,
  CheckCircle,
  AlertTriangle,
  Key,
  LogOut,
  MessageSquare,
  Calendar,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { signOut } from '@/lib/firebase-auth';
import { claimYEPProfile, getYEPProfileByUserId } from '@/app/youth-empowerment/profile-actions';
import { YEPParticipant, YEPMentor } from '@/lib/youth-empowerment';
import { ProfileDetailsNew } from '@/components/profile/profile-details-new';
import { ProfileDocumentsNew } from '@/components/profile/profile-documents-new';
import { ProfileSecurity } from '@/components/profile/profile-security';
import { ProfileMessages } from '@/components/profile/profile-messages';
import { ProfileMeetings } from '@/components/profile/profile-meetings';
import { useNotifications } from '@/hooks/use-notifications';
import { Badge } from '@/components/ui/badge';

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [profile, setProfile] = useState<YEPParticipant | YEPMentor | null>(null);
  const [role, setRole] = useState<'participant' | 'mentor' | null>(null);
  const [needsClaiming, setNeedsClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const notifications = useNotifications();

  const isWelcome = searchParams?.get('welcome') === 'true';
  const defaultTab = searchParams?.get('tab') || 'details';

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const result = await getYEPProfileByUserId(user.uid);

      if (result.success && result.profile) {
        setProfile(result.profile);
        setRole(result.role!);
        setNeedsClaiming(false);
      } else {
        // Profile not yet claimed
        setNeedsClaiming(true);
      }
    } catch (err) {
      console.error('Error loading profile:', err);
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleClaimProfile = async (inviteCode?: string) => {
    if (!user || !user.email) return;

    setClaiming(true);
    setError(null);

    try {
      const result = await claimYEPProfile(user.uid, user.email, inviteCode);

      if (result.success) {
        toast({
          title: 'Profile Claimed',
          description: 'Your profile has been successfully linked to your account',
        });

        // Reload profile
        await loadProfile();
      } else {
        setError(result.error || 'Failed to claim profile');
        toast({
          title: 'Error',
          description: result.error || 'Failed to claim profile',
          variant: 'destructive',
        });
      }
    } catch (err) {
      console.error('Error claiming profile:', err);
      setError('An unexpected error occurred');
    } finally {
      setClaiming(false);
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

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Profile claiming flow
  if (needsClaiming) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {isWelcome ? 'Welcome!' : 'Claim Your Profile'}
            </CardTitle>
            <CardDescription>
              {isWelcome
                ? 'Let\'s set up your profile'
                : 'Link your account to your YEP profile'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-sm font-medium mb-2">Signed in as:</p>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>

              <div className="space-y-2">
                <Button
                  onClick={() => handleClaimProfile()}
                  disabled={claiming}
                  className="w-full"
                >
                  {claiming ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Claiming Profile...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      {isWelcome ? 'Continue to Your Profile' : 'Claim Profile with Email'}
                    </>
                  )}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  {isWelcome 
                    ? 'Your profile will be automatically linked to this email'
                    : 'This will link your account to any existing profile with this email'}
                </p>
              </div>

              {/* Only show invite code option if NOT coming from welcome email */}
              {!isWelcome && (
                <>
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">
                        or use invite code
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Enter invite code"
                      className="w-full px-3 py-2 border rounded-md"
                      id="invite-code-input"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const input = e.target as HTMLInputElement;
                          if (input.value.trim()) {
                            handleClaimProfile(input.value.trim());
                          }
                        }
                      }}
                    />
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        const input = document.getElementById('invite-code-input') as HTMLInputElement;
                        if (input && input.value.trim()) {
                          handleClaimProfile(input.value.trim());
                        }
                      }}
                      disabled={claiming}
                    >
                      <Key className="mr-2 h-4 w-4" />
                      Claim with Code
                    </Button>
                  </div>
                </>
              )}
            </div>

            <div className="pt-4 border-t text-center">
              <p className="text-sm text-muted-foreground mb-2">
                Need help?
              </p>
              <Button
                variant="link"
                onClick={() => router.push('/login')}
                className="text-sm"
              >
                Contact administrator
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Profile loaded - show dashboard
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-lg">
                <User className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">
                  {role === 'participant' ? profile.youthParticipant : profile.name}
                </h1>
                <p className="text-muted-foreground capitalize">{role} Profile</p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="gap-2"
            >
              {isSigningOut ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing out...
                </>
              ) : (
                <>
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </>
              )}
            </Button>
          </div>
        </div>

        {isWelcome && (
          <Alert className="mb-6 border-green-500 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Welcome to the Youth Empowerment Program! Your profile has been set up.
              You can now update your information and upload documents.
            </AlertDescription>
          </Alert>
        )}

        {/* Profile Tabs */}
        <Tabs defaultValue={defaultTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 h-auto">
            <TabsTrigger value="details" className="gap-2 py-3">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Details</span>
            </TabsTrigger>
            <TabsTrigger value="documents" className="gap-2 py-3">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Documents</span>
            </TabsTrigger>
            <TabsTrigger value="messages" className="gap-2 py-3 relative">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Messages</span>
              {notifications.unreadMessages > 0 && (
                <Badge variant="default" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {notifications.unreadMessages > 99 ? '99+' : notifications.unreadMessages}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="meetings" className="gap-2 py-3 relative">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Meetings</span>
              {notifications.pendingMeetings > 0 && (
                <Badge variant="default" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {notifications.pendingMeetings > 99 ? '99+' : notifications.pendingMeetings}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2 py-3">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Security</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-6">
            <ProfileDetailsNew
              profile={profile}
              role={role!}
              onUpdate={loadProfile}
            />
          </TabsContent>

          <TabsContent value="documents" className="space-y-6">
            <ProfileDocumentsNew
              profile={profile}
              role={role!}
              onUpdate={loadProfile}
            />
          </TabsContent>

          <TabsContent value="messages" className="space-y-6">
            <ProfileMessages
              profile={profile}
              role={role!}
            />
          </TabsContent>

          <TabsContent value="meetings" className="space-y-6">
            <ProfileMeetings
              profile={profile}
              role={role!}
            />
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <ProfileSecurity user={user} profile={profile} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

