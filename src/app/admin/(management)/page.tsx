'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Loader2, Shield, Users, Database, Settings, Activity, AlertTriangle, GraduationCap } from 'lucide-react';
import { EnhancedUserManagement } from '@/components/admin/enhanced-user-management';
import { SystemHealth } from '@/components/admin/system-health';
import { DataManagement } from '@/components/admin/data-management';
import { SecuritySettings } from '@/components/admin/security-settings';
// ActivityLog deprecated in favor of unified AdminActivityFeed
import { AdminActivityFeed } from '@/components/admin/admin-activity-feed';
import { PlatformStats } from '@/components/admin/platform-stats';
import { CurrentParticipantsImporter } from '@/components/youth-empowerment/current-participants-importer';
import { ImportDialog } from '@/components/youth-empowerment/import-dialog';
import { YEPInvites } from '@/components/admin/yep-invites';
import { YEPBackfill } from '@/components/admin/yep-backfill';
import { WebhookSettings } from '@/components/admin/webhook-settings';
import { NavCustomization } from '@/components/admin/nav-customization';

export default function AdminPage() {
  const { user, isAdmin, loading } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [timeoutError, setTimeoutError] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Server layout already enforces admin. Avoid client-side false negatives causing redirects.

  // Add timeout to detect stuck loading state
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading) {
        console.error('Auth loading timeout - check Firebase configuration');
        setTimeoutError(true);
      }
    }, 10000); // 10 second timeout

    return () => clearTimeout(timeout);
  }, [loading]);

  if (!mounted || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        {timeoutError && (
          <div className="text-center max-w-md">
            <p className="text-red-500 font-semibold mb-2">Loading timeout</p>
            <p className="text-sm text-muted-foreground">
              Check browser console for errors. Firebase may not be configured correctly.
            </p>
            <Button
              onClick={() => window.location.reload()}
              className="mt-4"
              variant="outline"
            >
              Reload Page
            </Button>
          </div>
        )}
      </div>
    );
  }

  // At this point, server allowed access; render regardless of client-side role computation.

  return (
    <div className="container mx-auto py-4 sm:py-8 px-4">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Admin Panel</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Platform management and configuration</p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <PlatformStats />

      {/* Quick Actions */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Quick Actions
          </CardTitle>
          <CardDescription>Common administrative tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <Button
              variant="outline"
              className="h-auto flex-col gap-2 py-4"
              onClick={() => {
                const tabsList = document.querySelector('[role="tablist"]');
                const usersTab = tabsList?.querySelector('[value="users"]') as HTMLButtonElement;
                usersTab?.click();
              }}
            >
              <Users className="h-5 w-5" />
              <span className="text-xs">Manage Users</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto flex-col gap-2 py-4"
              onClick={() => {
                const tabsList = document.querySelector('[role="tablist"]');
                const yepTab = tabsList?.querySelector('[value="yep-invites"]') as HTMLButtonElement;
                yepTab?.click();
              }}
            >
              <GraduationCap className="h-5 w-5" />
              <span className="text-xs">YEP Invites</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto flex-col gap-2 py-4"
              onClick={() => {
                const tabsList = document.querySelector('[role="tablist"]');
                const healthTab = tabsList?.querySelector('[value="health"]') as HTMLButtonElement;
                healthTab?.click();
              }}
            >
              <Activity className="h-5 w-5" />
              <span className="text-xs">System Health</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto flex-col gap-2 py-4"
              onClick={() => {
                const tabsList = document.querySelector('[role="tablist"]');
                const dataTab = tabsList?.querySelector('[value="data"]') as HTMLButtonElement;
                dataTab?.click();
              }}
            >
              <Database className="h-5 w-5" />
              <span className="text-xs">Data Export</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto flex-col gap-2 py-4"
              onClick={() => {
                const tabsList = document.querySelector('[role="tablist"]');
                const activityTab = tabsList?.querySelector('[value="activity"]') as HTMLButtonElement;
                activityTab?.click();
              }}
            >
              <Activity className="h-5 w-5" />
              <span className="text-xs">Activity Log</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto flex-col gap-2 py-4"
              onClick={() => window.location.href = '/dashboard'}
            >
              <Settings className="h-5 w-5" />
              <span className="text-xs">Dashboard</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs defaultValue="users" className="space-y-4 sm:space-y-6">
        <TabsList className="grid w-full grid-cols-4 sm:grid-cols-4 lg:grid-cols-8 h-auto gap-1">
          <TabsTrigger value="users" className="flex items-center gap-1 sm:gap-2 py-2 sm:py-3 px-2 sm:px-4 min-h-[44px]">
            <Users className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="hidden sm:inline text-xs sm:text-sm">Users</span>
          </TabsTrigger>
          <TabsTrigger value="yep-invites" className="flex items-center gap-1 sm:gap-2 py-2 sm:py-3 px-2 sm:px-4 min-h-[44px]">
            <GraduationCap className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="hidden sm:inline text-xs sm:text-sm">YEP Invites</span>
          </TabsTrigger>
          <TabsTrigger value="health" className="flex items-center gap-1 sm:gap-2 py-2 sm:py-3 px-2 sm:px-4 min-h-[44px]">
            <Activity className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="hidden sm:inline text-xs sm:text-sm">Health</span>
          </TabsTrigger>
          <TabsTrigger value="data" className="flex items-center gap-1 sm:gap-2 py-2 sm:py-3 px-2 sm:px-4 min-h-[44px]">
            <Database className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="hidden sm:inline text-xs sm:text-sm">Data</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-1 sm:gap-2 py-2 sm:py-3 px-2 sm:px-4 min-h-[44px]">
            <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="hidden sm:inline text-xs sm:text-sm">Security</span>
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex items-center gap-1 sm:gap-2 py-2 sm:py-3 px-2 sm:px-4 min-h-[44px]">
            <Activity className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="hidden sm:inline text-xs sm:text-sm">Activity</span>
          </TabsTrigger>
          <TabsTrigger value="yep" className="flex items-center gap-1 sm:gap-2 py-2 sm:py-3 px-2 sm:px-4 min-h-[44px]">
            <GraduationCap className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="hidden sm:inline text-xs sm:text-sm">YEP</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-1 sm:gap-2 py-2 sm:py-3 px-2 sm:px-4 min-h-[44px]">
            <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="hidden sm:inline text-xs sm:text-sm">Settings</span>
          </TabsTrigger>
        </TabsList>

        {/* User Management Tab */}
        <TabsContent value="users" className="space-y-4">
          <EnhancedUserManagement />
        </TabsContent>

        {/* YEP Invites Tab */}
        <TabsContent value="yep-invites" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                YEP Invitations
              </CardTitle>
              <CardDescription>
                Invite participants and mentors to the Youth Empowerment Program
              </CardDescription>
            </CardHeader>
            <CardContent>
              <YEPInvites />
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Health Tab */}
        <TabsContent value="health" className="space-y-4">
          <SystemHealth />
        </TabsContent>

        {/* Data Management Tab */}
        <TabsContent value="data" className="space-y-4">
          <DataManagement />
        </TabsContent>

        {/* Security Settings Tab */}
        <TabsContent value="security" className="space-y-4">
          <SecuritySettings />
        </TabsContent>

        {/* Activity Log Tab */}
        <TabsContent value="activity" className="space-y-4">
          <AdminActivityFeed />
        </TabsContent>

        {/* Youth Empowerment Program Tab */}
        <TabsContent value="yep" className="space-y-4">
          {/* Backfill Tools */}
          <YEPBackfill />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Youth Empowerment Program
              </CardTitle>
              <CardDescription>
                Manage the Youth Empowerment Program portal and data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Program Management</CardTitle>
                    <CardDescription>
                      Access the full YEP management portal
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button asChild className="w-full">
                      <a href="/youth-empowerment">
                        <GraduationCap className="h-4 w-4 mr-2" />
                        Open YEP Portal
                      </a>
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Quick Actions</CardTitle>
                    <CardDescription>
                      Common YEP management tasks
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button variant="outline" className="w-full justify-start">
                      <Users className="h-4 w-4 mr-2" />
                      View All Participants
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <GraduationCap className="h-4 w-4 mr-2" />
                      Manage Mentors
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Activity className="h-4 w-4 mr-2" />
                      Workshop Attendance
                    </Button>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Data Import & Export</CardTitle>
                  <CardDescription>
                    Import and export YEP data in various formats
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button
                    onClick={() => setIsImportDialogOpen(true)}
                    className="w-full justify-start"
                  >
                    <Database className="h-4 w-4 mr-2" />
                    Import Data (CSV/JSON/Excel)
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Database className="h-4 w-4 mr-2" />
                    Export Data
                  </Button>
                </CardContent>
              </Card>

              <CurrentParticipantsImporter />

              <Card>
                <CardHeader>
                  <CardTitle>YEP Data Overview</CardTitle>
                  <CardDescription>
                    Quick statistics and health metrics for the Youth Empowerment Program
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold text-primary">0</div>
                      <div className="text-sm text-muted-foreground">Participants</div>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold text-primary">0</div>
                      <div className="text-sm text-muted-foreground">Mentors</div>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold text-primary">0</div>
                      <div className="text-sm text-muted-foreground">Workshops</div>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold text-primary">0</div>
                      <div className="text-sm text-muted-foreground">Meetings</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Platform Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <NavCustomization />
          <WebhookSettings />
        </TabsContent>
      </Tabs>

      {/* Import Dialog */}
      <ImportDialog
        isOpen={isImportDialogOpen}
        onClose={() => setIsImportDialogOpen(false)}
        onSuccess={() => {
          setIsImportDialogOpen(false);
          // Optionally refresh data or show success message
        }}
      />
    </div>
  );
}

