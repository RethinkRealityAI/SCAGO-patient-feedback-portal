'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  UserPlus, Trash2, Shield, Eye, Clock, Activity,
  Search, Mail, Calendar, LogIn, AlertTriangle,
  Info, CheckCircle, XCircle, Loader2, Crown, Users, GraduationCap, User
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getUserActivityLogs, getUserLoginHistory, type UserActivity } from '@/lib/firebase-admin-users';
import { getPagePermissions } from '@/lib/page-permissions-actions';
import { PAGE_PERMISSIONS, type PagePermission } from '@/lib/permissions';
import {
  listPlatformUsers,
  createPlatformUser,
  setUserRole,
  setUserDisabled,
  deleteUserById,
  updateUserPassword,
  setUserPagePermissions,
  getUserPagePermissions,
  getRegionAccessPolicy,
  setRegionAccessPolicy,
  type RegionAccessPolicyMode,
  type PlatformUser,
  type AppRole,
} from '@/app/admin/user-actions';
import { backfillRoleClaims } from '@/app/admin/backfill-role-claims';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getSurveys } from '@/app/actions';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { REGIONS } from '@/types/patient';
import { useAuth } from '@/hooks/use-auth';

// Admin-assignable regions (exclude Unknown - all admins see Unknown-region patients automatically)
const ADMIN_REGIONS = REGIONS.filter((r) => r !== 'Unknown');
type AccessPreset = {
  id: string;
  label: string;
  description: string;
  routes: string[];
};

const ACCESS_PRESETS: AccessPreset[] = [
  {
    id: 'regional-single',
    label: 'Regional Admin (Single Region)',
    description: 'Patient-focused access with one selected region.',
    routes: ['patient-management'],
  },
  {
    id: 'regional-multi',
    label: 'Regional Admin (Multi-Region)',
    description: 'Patient-focused access with multiple selected regions.',
    routes: ['patient-management'],
  },
  {
    id: 'form-admin',
    label: 'Form Admin',
    description: 'Survey/dashboard access without patient visibility.',
    routes: ['forms-dashboard', 'forms-editor', 'yep-forms'],
  },
];

export function EnhancedUserManagement() {
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<PlatformUser | null>(null);
  const [userLogins, setUserLogins] = useState<Date[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createDisplayName, setCreateDisplayName] = useState('');
  const [createRole, setCreateRole] = useState<AppRole>('participant');
  const [createRoutes, setCreateRoutes] = useState<string[]>([]);
  const [savingAction, setSavingAction] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [passwordStrength, setPasswordStrength] = useState<'weak' | 'medium' | 'strong'>('weak');
  const [editRole, setEditRole] = useState<AppRole | null>(null);
  const [editRoutes, setEditRoutes] = useState<string[]>([]);
  const [editForms, setEditForms] = useState<string[]>([]);
  const [createForms, setCreateForms] = useState<string[]>([]);
  const [editRegions, setEditRegions] = useState<string[]>([]);
  const [createRegions, setCreateRegions] = useState<string[]>([]);
  const [surveys, setSurveys] = useState<Array<{ id: string; title: string }>>([]);
  const [adminWarnings, setAdminWarnings] = useState<string[]>([]);
  const [regionPolicyMode, setRegionPolicyMode] = useState<RegionAccessPolicyMode>('legacy');
  const [policySaving, setPolicySaving] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedUser?.role === 'admin') {
      setAdminWarnings(getAdminConfigWarnings(editRoutes, editForms, editRegions));
    } else {
      setAdminWarnings([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUser?.uid, selectedUser?.role, editRoutes, editForms, editRegions]);

  const loadData = async () => {
    setLoading(true);

    // Load users from Admin SDK
    const usersResult = await listPlatformUsers();
    setUsers(usersResult.users || []);

    // Load activity logs
    const activityResult = await getUserActivityLogs(50);
    if (activityResult.activities) {
      setActivities(activityResult.activities);
    }

    setLoading(false);

    // Load surveys for form access control
    const surveysResult = await getSurveys();
    setSurveys(surveysResult || []);

    // Load region access policy mode
    const policyRes = await getRegionAccessPolicy();
    if (policyRes.success) {
      setRegionPolicyMode(policyRes.mode);
    }
  };

  const handleViewUser = async (user: PlatformUser) => {
    setSelectedUser(user);
    setEditRole(user.role);
    setNewPassword(''); // Clear any leftover password from a previous user
    // Load page permissions for editing (only for admin users)
    if (user.role === 'admin') {
      try {
        const res = await getUserPagePermissions(user.email);
        setEditRoutes(res.permissions || []);
        setEditForms(res.allowedForms || []);
        setEditRegions(res.allowedRegions || []);
      } catch {
        setEditRoutes([]);
        setEditForms([]);
        setEditRegions([]);
      }
    } else {
      setEditRoutes([]);
      setEditForms([]);
      setEditRegions([]);
    }

    // Load user's login history
    const result = await getUserLoginHistory(user.email);
    if (result.logins) {
      setUserLogins(result.logins);
    }
  };

  const handleDeleteUser = async (user: PlatformUser) => {
    if (!confirm(`Delete ${user.email}? This permanently removes their account.`)) {
      return;
    }

    setSavingAction(true);
    const result = await deleteUserById(user.uid);
    setSavingAction(false);
    if ((result as any).success) {
      toast({
        title: 'User Deleted',
        description: `${user.email} has been removed`,
      });
      loadData();
    } else {
      toast({
        title: 'Error',
        description: (result as any).error || 'Failed to delete user',
        variant: 'destructive',
      });
    }
  };

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredActivities = activities.filter(activity =>
    activity.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    activity.action.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Role descriptions for better UX
  const roleDescriptions: Record<AppRole, { label: string; description: string; icon: React.ReactNode }> = {
    'super-admin': {
      label: 'Super Administrator',
      description: 'Full system access with no restrictions - can manage all users, roles, and platform features',
      icon: <Crown className="h-4 w-4 text-yellow-500" />
    },
    'admin': {
      label: 'Administrator',
      description: 'Page-level access based on assigned permissions - can manage specific platform areas',
      icon: <Shield className="h-4 w-4 text-blue-500" />
    },
    'mentor': {
      label: 'Mentor',
      description: 'Youth Empowerment Program mentor - profile access only',
      icon: <Users className="h-4 w-4 text-green-500" />
    },
    'participant': {
      label: 'Participant',
      description: 'Youth Empowerment Program participant - profile access only',
      icon: <User className="h-4 w-4 text-purple-500" />
    }
  };

  // Calculate password strength
  useEffect(() => {
    if (!createPassword) {
      setPasswordStrength('weak');
      return;
    }
    const length = createPassword.length;
    const hasUpper = /[A-Z]/.test(createPassword);
    const hasLower = /[a-z]/.test(createPassword);
    const hasNumber = /[0-9]/.test(createPassword);
    const hasSpecial = /[^A-Za-z0-9]/.test(createPassword);

    const score = [length >= 8, hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length;

    if (score >= 4) setPasswordStrength('strong');
    else if (score >= 2) setPasswordStrength('medium');
    else setPasswordStrength('weak');
  }, [createPassword]);

  // Validate email format
  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };
  const createAdminWarnings = createRole === 'admin'
    ? getAdminConfigWarnings(createRoutes, createForms, createRegions)
    : [];

  function getAdminConfigWarnings(routes: string[], forms: string[], regions: string[]) {
    const warnings: string[] = [];
    if (routes.length === 0) warnings.push('No page permissions selected. Admin users need at least one page permission.');
    if (routes.includes('patient-management') && regions.length === 0) {
      warnings.push(
        regionPolicyMode === 'strict'
          ? 'Strict mode: no regions assigned means this admin will only see Unknown-region patients.'
          : 'Legacy mode: no regions assigned means this admin will see all patient regions.'
      );
    }
    if (!routes.includes('patient-management') && regions.length > 0) {
      warnings.push('Regions are selected but Patient Management is not enabled, so region selection will have no effect.');
    }
    if (forms.length > 0 && !routes.includes('forms-dashboard')) {
      warnings.push('Form restrictions are configured, but Forms Dashboard permission is not enabled.');
    }
    return warnings;
  }

  const applyCreatePreset = (presetId: string) => {
    const preset = ACCESS_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setCreateRole('admin');
    setCreateRoutes(preset.routes);
    if (preset.id === 'form-admin') {
      setCreateRegions([]);
    }
  };

  const applyEditPreset = (presetId: string) => {
    const preset = ACCESS_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setEditRole('admin');
    setEditRoutes(preset.routes);
    if (preset.id === 'form-admin') {
      setEditRegions([]);
    }
  };

  const saveSelectedUserPermissions = async (actionLabel: string = 'Permissions saved') => {
    if (!selectedUser) return;
    const warnings = getAdminConfigWarnings(editRoutes, editForms, editRegions);
    setAdminWarnings(warnings);
    if (editRoutes.length === 0) {
      toast({
        title: 'Validation error',
        description: 'Please select at least one page permission for this admin.',
        variant: 'destructive',
      });
      return;
    }

    const currentEmail = user?.email?.toLowerCase();
    const targetEmail = selectedUser.email.toLowerCase();
    const isSelf = currentEmail && currentEmail === targetEmail;
    if (isSelf && !editRoutes.includes('user-management')) {
      const proceed = confirm('You are removing your own User Management access. You may lose access to this admin panel. Continue?');
      if (!proceed) return;
    }

    if (editRoutes.includes('patient-management') && editRegions.length === 0) {
      const proceed = confirm(
        regionPolicyMode === 'strict'
          ? 'Strict mode is enabled: no regions selected means this admin will only see Unknown-region patients. Continue?'
          : 'No regions selected means this admin can access all patient regions. Continue?'
      );
      if (!proceed) return;
    }

    setSavingAction(true);
    const res = await setUserPagePermissions(selectedUser.email, editRoutes, editForms, editRegions);
    setSavingAction(false);
    if ((res as any).success) {
      toast({ title: actionLabel, description: `Updated access for ${selectedUser.email}` });
    } else {
      toast({ title: 'Error', description: (res as any).error || 'Failed to save permissions', variant: 'destructive' });
    }
  };

  return (
    <Tabs defaultValue="users" className="space-y-4">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="users">
          <Shield className="h-4 w-4 mr-2" />
          Users ({users.length})
        </TabsTrigger>
        <TabsTrigger value="activity">
          <Activity className="h-4 w-4 mr-2" />
          Activity Log
        </TabsTrigger>
        <TabsTrigger value="create">
          <UserPlus className="h-4 w-4 mr-2" />
          Create User
        </TabsTrigger>
      </TabsList>

      {/* Users Tab */}
      <TabsContent value="users" className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>User Management</CardTitle>
                <CardDescription>
                  View and manage all platform users
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  if (!confirm('This will sync roles from Firestore to Firebase Auth custom claims for all users without roles. Continue?')) {
                    return;
                  }
                  setSavingAction(true);
                  try {
                    const result = await backfillRoleClaims();
                    if (result.success) {
                      toast({
                        title: 'Backfill Complete',
                        description: `Processed ${result.usersProcessed} users, set ${result.rolesSet} roles. Check console for details.`,
                      });
                      await loadData(); // Refresh the user list
                    } else {
                      toast({
                        title: 'Backfill Completed with Errors',
                        description: `Set ${result.rolesSet} roles but encountered ${result.errors.length} errors.`,
                        variant: 'destructive',
                      });
                    }
                  } catch (error) {
                    toast({
                      title: 'Backfill Failed',
                      description: error instanceof Error ? error.message : 'Unknown error',
                      variant: 'destructive',
                    });
                  } finally {
                    setSavingAction(false);
                  }
                }}
                disabled={savingAction}
              >
                {savingAction ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <Activity className="h-4 w-4 mr-2" />
                    Sync Roles (Backfill)
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="mb-4 rounded-md border p-3 bg-accent/10 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Region Access Policy Mode</p>
                  <p className="text-xs text-muted-foreground">
                    Controls what happens when an admin has no assigned regions.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={regionPolicyMode}
                    onValueChange={(value) => setRegionPolicyMode(value as RegionAccessPolicyMode)}
                  >
                    <SelectTrigger className="w-[220px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="legacy">Legacy-compatible (empty = all regions)</SelectItem>
                      <SelectItem value="strict">Strict (empty = Unknown only)</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={policySaving}
                    onClick={async () => {
                      setPolicySaving(true);
                      const res = await setRegionAccessPolicy(regionPolicyMode);
                      setPolicySaving(false);
                      if ((res as any).success) {
                        toast({ title: 'Policy updated', description: `Region policy is now ${regionPolicyMode === 'strict' ? 'Strict' : 'Legacy-compatible'}.` });
                      } else {
                        toast({ title: 'Error', description: (res as any).error || 'Failed to update policy', variant: 'destructive' });
                      }
                    }}
                  >
                    {policySaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                    Save
                  </Button>
                </div>
              </div>
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  <strong>Legacy-compatible:</strong> admins with no regions can see all patient regions.{' '}
                  <strong>Strict:</strong> admins with no regions can only see Unknown-region patients.
                </AlertDescription>
              </Alert>
            </div>

            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading users...
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No users found
              </div>
            ) : (
              <div className="space-y-2">
                {filteredUsers.map((user) => (
                  <div
                    key={user.uid}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className="p-2 bg-primary/10 rounded-full">
                        {user.role === 'admin' ? (
                          <Shield className="h-4 w-4 text-primary" />
                        ) : (
                          <Mail className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{user.email}</p>
                          <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                            {user.role}
                          </Badge>
                          {user.disabled && <Badge variant="destructive">Disabled</Badge>}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Created: {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}
                          </span>
                          {user.lastLoginAt && (
                            <span className="flex items-center gap-1">
                              <LogIn className="h-3 w-3" />
                              Last login: {new Date(user.lastLoginAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewUser(user)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteUser(user)}
                        disabled={users.length === 1}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* User Details Dialog — wide landscape layout */}
        <Dialog open={!!selectedUser} onOpenChange={(open) => {
          if (!open) {
            setSelectedUser(null);
            setNewPassword('');
          }
        }}>
          <DialogContent className="max-w-[95vw] w-full lg:max-w-5xl xl:max-w-6xl max-h-[90vh] p-0 gap-0 overflow-hidden flex flex-col">
            <DialogHeader className="px-6 pt-6 pb-3 border-b shrink-0">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <DialogTitle className="text-lg">User Details</DialogTitle>
                  <DialogDescription className="truncate">
                    {selectedUser?.email}
                  </DialogDescription>
                </div>
                {selectedUser && (
                  <Badge variant={selectedUser.disabled ? 'destructive' : 'default'} className="shrink-0">
                    {selectedUser.disabled ? 'Disabled' : 'Active'}
                  </Badge>
                )}
              </div>
            </DialogHeader>

            {selectedUser && (
              <ScrollArea className="flex-1 overflow-auto" style={{ maxHeight: 'calc(90vh - 80px)' }}>
                <div className="p-6 space-y-6">
                  {/* Top: User Info + Role — side-by-side on lg */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left — User info card */}
                    <div className="rounded-lg border bg-card p-4 space-y-4">
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Account Info</h3>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                        <div>
                          <p className="text-xs text-muted-foreground">Email</p>
                          <p className="text-sm font-medium break-all">{selectedUser.email}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">User ID</p>
                          <p className="text-xs font-mono text-muted-foreground break-all">{selectedUser.uid}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Created</p>
                          <p className="text-sm">{selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleString() : '—'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Last Login</p>
                          <p className="text-sm">{selectedUser.lastLoginAt ? new Date(selectedUser.lastLoginAt).toLocaleString() : 'Never'}</p>
                        </div>
                      </div>

                      <Separator />

                      {/* Password & Status */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground font-medium">Reset Password</p>
                          <div className="flex gap-2">
                            <Input
                              type="password"
                              placeholder="New password"
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              className="h-9 text-sm"
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                if (!newPassword) return;
                                setSavingAction(true);
                                const res = await updateUserPassword(selectedUser.uid, newPassword);
                                setSavingAction(false);
                                if ((res as any).success) {
                                  setNewPassword('');
                                  toast({ title: 'Password updated', description: 'User password has been changed' });
                                } else {
                                  toast({ title: 'Error', description: (res as any).error || 'Failed to update password', variant: 'destructive' });
                                }
                              }}
                              disabled={savingAction || !newPassword}
                            >
                              Update
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground font-medium">Account Status</p>
                          <Button
                            variant={selectedUser.disabled ? 'default' : 'outline'}
                            size="sm"
                            className="w-full sm:w-auto"
                            onClick={async () => {
                              setSavingAction(true);
                              const res = await setUserDisabled(selectedUser.uid, !selectedUser.disabled);
                              setSavingAction(false);
                              if ((res as any).success) {
                                const updated = { ...selectedUser, disabled: !selectedUser.disabled } as PlatformUser;
                                setSelectedUser(updated);
                                setUsers((prev) => prev.map(u => u.uid === updated.uid ? updated : u));
                              } else {
                                toast({ title: 'Error', description: (res as any).error || 'Failed to update status', variant: 'destructive' });
                              }
                            }}
                            disabled={savingAction}
                          >
                            {selectedUser.disabled ? 'Enable User' : 'Disable User'}
                          </Button>
                        </div>
                      </div>

                      <Separator />

                      {/* Recent Logins */}
                      <div>
                        <p className="text-xs text-muted-foreground font-medium mb-2">Recent Logins ({userLogins.length})</p>
                        <div className="max-h-28 overflow-y-auto space-y-1">
                          {userLogins.length === 0 ? (
                            <p className="text-xs text-muted-foreground italic">No login history</p>
                          ) : (
                            userLogins.map((login, index) => (
                              <div key={index} className="text-xs text-muted-foreground flex items-center gap-2">
                                <Clock className="h-3 w-3 shrink-0" />
                                {login.toLocaleString()}
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right — Role + Presets + Summary */}
                    <div className="rounded-lg border bg-card p-4 space-y-4">
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Role & Access</h3>
                      <div className="space-y-2">
                        <Label className="text-xs">Role</Label>
                        <div className="flex items-center gap-2">
                          <Select
                            value={editRole || selectedUser.role}
                            onValueChange={(value) => setEditRole(value as AppRole)}
                          >
                            <SelectTrigger className="w-full sm:w-[220px] h-10">
                              <SelectValue placeholder="Select a role">
                                {(editRole || selectedUser.role) && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-primary">{roleDescriptions[(editRole || selectedUser.role) as AppRole].icon}</span>
                                    <span className="font-medium">{roleDescriptions[(editRole || selectedUser.role) as AppRole].label}</span>
                                  </div>
                                )}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent className="min-w-[280px]">
                              {(['super-admin', 'admin', 'mentor', 'participant'] as AppRole[]).map((role) => {
                                const desc = roleDescriptions[role];
                                return (
                                  <SelectItem key={role} value={role} className="py-3 cursor-pointer">
                                    <div className="flex items-center gap-3 w-full">
                                      <span className="text-primary">{desc.icon}</span>
                                      <div className="flex-1">
                                        <div className="font-medium">{desc.label}</div>
                                        <div className="text-xs text-muted-foreground mt-0.5">{desc.description}</div>
                                      </div>
                                    </div>
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                          <Button
                            size="sm"
                            onClick={async () => {
                              if (!editRole) return;
                              setSavingAction(true);
                              const res = await setUserRole(selectedUser.uid, editRole);
                              setSavingAction(false);
                              if ((res as any).success) {
                                toast({ title: 'Role updated', description: `${selectedUser.email} is now ${roleDescriptions[editRole as AppRole].label}` });
                                const updatedUser = { ...selectedUser, role: editRole as AppRole };
                                setSelectedUser(updatedUser);
                                // Reload permissions for the new role to avoid stale state
                                if (editRole === 'admin') {
                                  try {
                                    const permsRes = await getUserPagePermissions(selectedUser.email);
                                    setEditRoutes(permsRes.permissions || []);
                                    setEditForms(permsRes.allowedForms || []);
                                    setEditRegions(permsRes.allowedRegions || []);
                                  } catch {
                                    setEditRoutes([]);
                                    setEditForms([]);
                                    setEditRegions([]);
                                  }
                                } else {
                                  setEditRoutes([]);
                                  setEditForms([]);
                                  setEditRegions([]);
                                }
                                loadData();
                              } else {
                                toast({ title: 'Error', description: (res as any).error || 'Failed to update role', variant: 'destructive' });
                              }
                            }}
                            disabled={savingAction || editRole === selectedUser.role}
                          >
                            {savingAction ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                            Save
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {roleDescriptions[(editRole || selectedUser.role) as AppRole].description}
                        </p>
                      </div>

                      {selectedUser.role === 'admin' && (
                        <>
                          <Separator />
                          <div className="space-y-2">
                            <Label className="text-xs font-medium">Quick Access Presets</Label>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                              {ACCESS_PRESETS.map((preset) => (
                                <Button
                                  key={preset.id}
                                  type="button"
                                  variant="outline"
                                  className="justify-start h-auto py-2 text-left"
                                  onClick={() => applyEditPreset(preset.id)}
                                >
                                  <span>
                                    <span className="block text-xs font-medium">{preset.label}</span>
                                    <span className="block text-[10px] text-muted-foreground leading-tight">{preset.description}</span>
                                  </span>
                                </Button>
                              ))}
                            </div>
                          </div>

                          <Separator />

                          <div className="space-y-2">
                            <Label className="text-xs font-medium">Effective Access Summary</Label>
                            <div className="rounded-md border bg-accent/20 p-3 text-xs space-y-1">
                              <p><strong>Pages:</strong> {editRoutes.length === 0 ? 'None selected' : `${editRoutes.length} selected`}</p>
                              <p><strong>Forms:</strong> {editForms.length === 0 ? 'All forms' : `${editForms.length} selected`}</p>
                              <p><strong>Regions:</strong> {editRegions.length === 0 ? (regionPolicyMode === 'strict' ? 'Unknown only (strict mode)' : 'All regions (legacy)') : editRegions.join(', ')}</p>
                              <p><strong>Unknown region patients:</strong> Always visible to admins</p>
                            </div>
                            {adminWarnings.length > 0 && (
                              <Alert className="py-2">
                                <AlertTriangle className="h-3.5 w-3.5" />
                                <AlertDescription className="text-xs">{adminWarnings[0]}</AlertDescription>
                              </Alert>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Admin-only sections: Permissions, Regions, Forms — 2-column grid */}
                  {selectedUser.role === 'admin' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Left column: Page Permissions + Region Access */}
                      <div className="space-y-6">
                        {/* Page Permissions */}
                        <div className="rounded-lg border bg-card p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Page Permissions</h3>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={async () => saveSelectedUserPermissions('Permissions saved')}
                              disabled={savingAction}
                              className="h-7 text-xs"
                            >
                              {savingAction ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : null}
                              Save Permissions
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Select which pages this admin can access.
                          </p>
                          <TooltipProvider>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {PAGE_PERMISSIONS.map((permission) => (
                                <Tooltip key={permission.key}>
                                  <TooltipTrigger asChild>
                                    <label
                                      className={`flex items-center gap-2.5 p-3 border-2 rounded-lg cursor-pointer transition-all ${editRoutes.includes(permission.key)
                                        ? 'border-primary bg-primary/5 hover:bg-primary/10'
                                        : 'border-border hover:border-primary/50 hover:bg-accent/30'
                                        }`}
                                    >
                                      <Checkbox
                                        checked={editRoutes.includes(permission.key)}
                                        onCheckedChange={(checked) => {
                                          if (checked) {
                                            setEditRoutes((prev) => [...prev, permission.key]);
                                          } else {
                                            setEditRoutes((prev) => prev.filter(k => k !== permission.key));
                                          }
                                        }}
                                        className="h-4 w-4"
                                      />
                                      <span className="text-sm font-medium">{permission.label}</span>
                                    </label>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="max-w-xs">
                                    <p className="text-xs">{permission.description}</p>
                                    <p className="text-xs text-muted-foreground mt-1">Route: {permission.route}</p>
                                  </TooltipContent>
                                </Tooltip>
                              ))}
                            </div>
                          </TooltipProvider>
                        </div>

                        {/* Region Access */}
                        <div className="rounded-lg border bg-card p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Region Access</h3>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="max-w-xs">
                                    <p className="text-xs">Controls which patients this admin can see. Patients with Unknown region are always visible.</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={async () => saveSelectedUserPermissions('Regions saved')}
                              disabled={savingAction}
                              className="h-7 text-xs"
                            >
                              {savingAction ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : null}
                              Save Regions
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Choose which regions this admin can access, or leave with no regions for default behavior.
                          </p>
                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-xs"
                              onClick={() => setEditRegions([...ADMIN_REGIONS])}
                            >
                              Select all
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-xs"
                              onClick={() => setEditRegions([])}
                            >
                              Clear all
                            </Button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {ADMIN_REGIONS.map((region) => (
                              <label
                                key={region}
                                className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg cursor-pointer transition-all text-sm ${
                                  editRegions.includes(region)
                                    ? 'border-primary bg-primary/5'
                                    : 'border-border hover:border-primary/30'
                                }`}
                              >
                                <Checkbox
                                  checked={editRegions.includes(region)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setEditRegions((prev) => [...prev, region]);
                                    } else {
                                      setEditRegions((prev) => prev.filter((r) => r !== region));
                                    }
                                  }}
                                  className="h-4 w-4"
                                />
                                {region}
                              </label>
                            ))}
                          </div>
                          <p className="text-[11px] text-muted-foreground bg-accent/30 px-2 py-1 rounded inline-block">
                            {editRegions.length === 0
                              ? (regionPolicyMode === 'strict'
                                  ? 'No regions assigned — Unknown-region patients only (strict mode)'
                                  : 'No regions assigned — access to all regions (legacy mode)')
                              : `${editRegions.length} region${editRegions.length === 1 ? '' : 's'} selected`}
                          </p>
                        </div>
                      </div>

                      {/* Right column: Form Access */}
                      <div className="space-y-6">
                        <div className="rounded-lg border bg-card p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Form Access</h3>
                            <div className="flex items-center gap-2">
                              {editForms.length > 0 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditForms([])}
                                  className="h-7 text-xs hover:text-primary"
                                >
                                  Reset to All
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={async () => saveSelectedUserPermissions('Form access saved')}
                                disabled={savingAction}
                                className="h-7 text-xs"
                              >
                                {savingAction ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : null}
                                Save Access
                              </Button>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Restrict to specific forms, or leave empty for all forms.
                          </p>

                          <ScrollArea className="h-[240px] rounded-md border p-3 bg-accent/5">
                            <div className="grid grid-cols-1 gap-2">
                              {surveys.map((survey) => (
                                <label
                                  key={survey.id}
                                  className={`flex items-center gap-3 p-2.5 border rounded-lg cursor-pointer transition-all ${editForms.includes(survey.id)
                                    ? 'border-primary bg-primary/5'
                                    : 'border-border hover:border-primary/30 hover:bg-background'
                                    }`}
                                >
                                  <Checkbox
                                    checked={editForms.includes(survey.id)}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        setEditForms((prev) => [...prev, survey.id]);
                                      } else {
                                        setEditForms((prev) => prev.filter(id => id !== survey.id));
                                      }
                                    }}
                                    className="h-4 w-4 shrink-0"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{survey.title}</p>
                                    <p className="text-[10px] text-muted-foreground font-mono truncate">{survey.id}</p>
                                  </div>
                                </label>
                              ))}
                            </div>
                            {surveys.length === 0 && (
                              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground italic text-sm">
                                <Info className="h-8 w-8 mb-2 opacity-20" />
                                No surveys found
                              </div>
                            )}
                          </ScrollArea>

                          <p className="text-[11px] text-muted-foreground bg-accent/30 px-2 py-1 rounded inline-block">
                            {editForms.length === 0
                              ? 'Accessing ALL forms'
                              : `Limited to ${editForms.length} selected form${editForms.length === 1 ? '' : 's'}`
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Non-admin roles: read-only info about permissions */}
                  {selectedUser.role !== 'admin' && (
                    <div className="rounded-lg border bg-card p-4 space-y-2">
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Permissions</h3>
                      <p className="text-xs text-muted-foreground">
                        {selectedUser.role === 'super-admin'
                          ? 'Super admins have unrestricted access to all pages, forms, and patient data.'
                          : 'Page and form permissions are only configurable for admin-role users.'}
                      </p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}
          </DialogContent>
        </Dialog>
      </TabsContent>

      {/* Activity Log Tab */}
      <TabsContent value="activity" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Activity Log</CardTitle>
            <CardDescription>
              Recent user actions and system events
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search activity..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {filteredActivities.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No activity found
              </div>
            ) : (
              <div className="space-y-2">
                {filteredActivities.map((activity, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 border rounded-lg"
                  >
                    <div className="p-2 bg-muted rounded-full">
                      <Activity className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{activity.action}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-muted-foreground">{activity.email}</p>
                        <span className="text-muted-foreground">•</span>
                        <p className="text-xs text-muted-foreground">
                          {activity.timestamp.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {activity.action}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Create User Tab */}
      <TabsContent value="create" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Create New User
            </CardTitle>
            <CardDescription>
              Create a new user account with role and permissions. The user will receive an email to verify their account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Error Alert */}
              {createError && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{createError}</AlertDescription>
                </Alert>
              )}

              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="create-email">
                      Email Address <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="create-email"
                      type="email"
                      placeholder="user@example.com"
                      value={createEmail}
                      onChange={(e) => {
                        setCreateEmail(e.target.value);
                        setCreateError(null);
                      }}
                      className={createEmail && !isValidEmail(createEmail) ? 'border-destructive' : ''}
                    />
                    {createEmail && !isValidEmail(createEmail) && (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <XCircle className="h-3 w-3" />
                        Please enter a valid email address
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="create-password">
                      Password <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="create-password"
                      type="password"
                      placeholder="Minimum 6 characters"
                      value={createPassword}
                      onChange={(e) => {
                        setCreatePassword(e.target.value);
                        setCreateError(null);
                      }}
                      className={createPassword && createPassword.length < 6 ? 'border-destructive' : ''}
                    />
                    {createPassword && (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all ${passwordStrength === 'strong' ? 'bg-green-500 w-full' :
                                passwordStrength === 'medium' ? 'bg-yellow-500 w-2/3' :
                                  'bg-red-500 w-1/3'
                                }`}
                            />
                          </div>
                          <span className={`text-xs ${passwordStrength === 'strong' ? 'text-green-600' :
                            passwordStrength === 'medium' ? 'text-yellow-600' :
                              'text-red-600'
                            }`}>
                            {passwordStrength === 'strong' ? 'Strong' :
                              passwordStrength === 'medium' ? 'Medium' : 'Weak'}
                          </span>
                        </div>
                        {createPassword.length < 6 && (
                          <p className="text-xs text-destructive flex items-center gap-1">
                            <XCircle className="h-3 w-3" />
                            Password must be at least 6 characters
                          </p>
                        )}
                        {createPassword.length >= 6 && passwordStrength !== 'strong' && (
                          <p className="text-xs text-muted-foreground">
                            Tip: Use uppercase, lowercase, numbers, and special characters for a stronger password
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="create-display-name">
                      Display Name <span className="text-muted-foreground text-xs">(Optional)</span>
                    </Label>
                    <Input
                      id="create-display-name"
                      placeholder="John Doe"
                      value={createDisplayName}
                      onChange={(e) => setCreateDisplayName(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      The user's display name for the platform
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="create-role">
                      User Role <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={createRole}
                      onValueChange={(value) => {
                        setCreateRole(value as AppRole);
                        setCreateError(null);
                      }}
                    >
                      <SelectTrigger id="create-role" className="h-11">
                        <SelectValue placeholder="Select a role">
                          {createRole && roleDescriptions[createRole] && (
                            <div className="flex items-center gap-2">
                              <span className="text-primary">{roleDescriptions[createRole].icon}</span>
                              <span className="font-medium">{roleDescriptions[createRole].label}</span>
                            </div>
                          )}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="min-w-[280px]">
                        {(['super-admin', 'admin', 'mentor', 'participant'] as AppRole[]).map((role) => {
                          const desc = roleDescriptions[role];
                          return (
                            <SelectItem
                              key={role}
                              value={role}
                              className="py-3 cursor-pointer"
                            >
                              <div className="flex items-center gap-3 w-full">
                                <span className="text-primary">{desc.icon}</span>
                                <div className="flex-1">
                                  <div className="font-medium">{desc.label}</div>
                                  <div className="text-xs text-muted-foreground mt-0.5">{desc.description}</div>
                                </div>
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-md text-sm">
                      <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-muted-foreground">
                        {roleDescriptions[createRole as AppRole]?.description || 'Select a role to see description'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {createRole === 'admin' && (
                <div className="space-y-4 border-t pt-4">
                  <Label className="text-base font-semibold">Quick Access Presets</Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    {ACCESS_PRESETS.map((preset) => (
                      <Button
                        key={preset.id}
                        type="button"
                        variant="outline"
                        className="justify-start h-auto py-2"
                        onClick={() => applyCreatePreset(preset.id)}
                      >
                        <span className="text-left">
                          <span className="block text-sm font-medium">{preset.label}</span>
                          <span className="block text-xs text-muted-foreground">{preset.description}</span>
                        </span>
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {createRole === 'admin' && (
                <div className="space-y-2 border-t pt-4">
                  <Label className="text-base font-semibold">Effective Access Summary (Preview)</Label>
                  <div className="rounded-md border bg-accent/20 p-3 text-xs space-y-1">
                    <p><strong>Pages:</strong> {createRoutes.length === 0 ? 'None selected' : `${createRoutes.length} selected`}</p>
                    <p><strong>Forms:</strong> {createForms.length === 0 ? 'All forms' : `${createForms.length} selected`}</p>
                    <p><strong>Regions:</strong> {createRegions.length === 0 ? (regionPolicyMode === 'strict' ? 'Unknown only (strict mode)' : 'All regions') : createRegions.join(', ')}</p>
                    <p><strong>Unknown region patients:</strong> Always visible to admins</p>
                  </div>
                  {createAdminWarnings.length > 0 && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>{createAdminWarnings[0]}</AlertDescription>
                    </Alert>
                  )}
                </div>
              )}

              {/* Page Permissions */}
              {(createRole === 'admin' || createRole === 'super-admin') && (
                <div className="space-y-4 border-t pt-4">
                  <div className="space-y-2">
                    <Label>Page Permissions</Label>
                    <p className="text-xs text-muted-foreground mb-3">
                      {createRole === 'super-admin'
                        ? 'Super admins have access to all pages automatically. No need to select permissions.'
                        : 'Select which pages this admin can access. Hover over each option for details.'}
                    </p>
                    {createRole === 'admin' && (
                      <TooltipProvider>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {PAGE_PERMISSIONS.map((permission) => (
                            <Tooltip key={permission.key}>
                              <TooltipTrigger asChild>
                                <label
                                  className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${createRoutes.includes(permission.key)
                                    ? 'border-primary bg-primary/5 hover:bg-primary/10'
                                    : 'border-border hover:border-primary/50 hover:bg-accent/30'
                                    }`}
                                >
                                  <Checkbox
                                    checked={createRoutes.includes(permission.key)}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        setCreateRoutes((prev) => [...prev, permission.key]);
                                      } else {
                                        setCreateRoutes((prev) => prev.filter(k => k !== permission.key));
                                      }
                                    }}
                                    className="h-5 w-5"
                                  />
                                  <span className="text-sm font-medium flex-1">{permission.label}</span>
                                </label>
                              </TooltipTrigger>
                              <TooltipContent side="right" className="max-w-xs">
                                <p className="text-xs">{permission.description}</p>
                                <p className="text-xs text-muted-foreground mt-1">Route: {permission.route}</p>
                              </TooltipContent>
                            </Tooltip>
                          ))}
                        </div>
                      </TooltipProvider>
                    )}
                    {createRole === 'super-admin' && (
                      <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                          Super administrators have unrestricted access to all pages and features.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </div>
              )}

              {/* Region Access (for Create User - admin only) */}
              {createRole === 'admin' && (
                <div className="space-y-4 border-t pt-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Label>Region Access</Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent side="right" className="max-w-xs">
                            <p className="text-xs">Controls which patients this admin can see. Leave with no regions for default behavior based on policy mode. Patients with Unknown region are always visible.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Select specific regions, or leave with no regions selected for default access.
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs"
                        onClick={() => setCreateRegions([...ADMIN_REGIONS])}
                      >
                        Select all
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs"
                        onClick={() => setCreateRegions([])}
                      >
                        Clear all
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {ADMIN_REGIONS.map((region) => (
                        <label
                          key={region}
                          className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg cursor-pointer transition-all text-sm ${
                            createRegions.includes(region)
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/30'
                          }`}
                        >
                          <Checkbox
                            checked={createRegions.includes(region)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setCreateRegions((prev) => [...prev, region]);
                              } else {
                                setCreateRegions((prev) => prev.filter((r) => r !== region));
                              }
                            }}
                            className="h-4 w-4"
                          />
                          {region}
                        </label>
                      ))}
                    </div>
                    <p className="text-[11px] text-muted-foreground bg-accent/30 px-2 py-1 rounded inline-block">
                      {createRegions.length === 0
                        ? (regionPolicyMode === 'strict'
                            ? 'No regions assigned — Unknown-region patients only (strict mode)'
                            : 'No regions assigned — access to all regions (legacy mode)')
                        : `${createRegions.length} region${createRegions.length === 1 ? '' : 's'} selected`}
                    </p>
                  </div>
                </div>
              )}

              {/* Form Access Control (for Create User) */}
              {createRole === 'admin' && (
                <div className="space-y-4 border-t pt-4">
                  <div className="space-y-2">
                    <Label>Form Access Control</Label>
                    <p className="text-xs text-muted-foreground mb-3">
                      Restrict access to specific forms. If no forms are selected, the admin will see ALL forms by default.
                    </p>
                    <ScrollArea className="h-[150px] rounded-md border p-4 bg-accent/5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {surveys.map((survey) => (
                          <label
                            key={survey.id}
                            className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${createForms.includes(survey.id)
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/30 hover:bg-background'
                              }`}
                          >
                            <Checkbox
                              checked={createForms.includes(survey.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setCreateForms((prev) => [...prev, survey.id]);
                                } else {
                                  setCreateForms((prev) => prev.filter(id => id !== survey.id));
                                }
                              }}
                              className="h-4 w-4"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{survey.title}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    </ScrollArea>
                    <p className="text-[10px] text-muted-foreground mt-2">
                      {createForms.length === 0
                        ? "Currently set to: Access ALL forms"
                        : `Currently set to: Access to ${createForms.length} selected form${createForms.length === 1 ? '' : 's'}`
                      }
                    </p>
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between border-t pt-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Info className="h-3 w-3" />
                  <span>Role and permissions take effect on the user's next login</span>
                </div>
                <Button
                  onClick={async () => {
                    // Validate inputs
                    if (!createEmail || !isValidEmail(createEmail)) {
                      setCreateError('Please enter a valid email address');
                      return;
                    }
                    if (!createPassword || createPassword.length < 6) {
                      setCreateError('Password must be at least 6 characters');
                      return;
                    }
                    if (createRole === 'admin' && createRoutes.length === 0) {
                      setCreateError('Please assign at least one page permission for admin users.');
                      return;
                    }
                    if (createRole === 'admin' && createRoutes.includes('patient-management') && createRegions.length === 0) {
                      const proceed = confirm(
                        regionPolicyMode === 'strict'
                          ? 'Strict mode is enabled: no regions selected means this admin will only see Unknown-region patients. Continue?'
                          : 'No regions selected means this admin can access all patient regions. Continue?'
                      );
                      if (!proceed) return;
                    }

                    setCreateError(null);
                    setSavingAction(true);

                    try {
                      const res = await createPlatformUser({
                        email: createEmail,
                        password: createPassword,
                        displayName: createDisplayName || undefined,
                        role: createRole,
                        pagePermissions: createRoutes,
                        allowedForms: createForms,
                        allowedRegions: createRegions.length > 0 ? createRegions : undefined,
                      });

                      if ((res as any).success) {
                        toast({
                          title: 'User Created Successfully',
                          description: `${createEmail} has been created with ${roleDescriptions[createRole].label} role`,
                        });
                        // Reset form
                        setCreateEmail('');
                        setCreatePassword('');
                        setCreateDisplayName('');
                        setCreateRole('participant');
                        setCreateRoutes([]);
                        setCreateForms([]);
                        setCreateRegions([]);
                        setCreateError(null);
                        // Reload user list
                        loadData();
                      } else {
                        const errorMsg = (res as any).error || 'Failed to create user';
                        setCreateError(errorMsg);
                        toast({
                          title: 'Error Creating User',
                          description: errorMsg,
                          variant: 'destructive',
                        });
                      }
                    } catch (error: any) {
                      const errorMsg = error?.message || 'An unexpected error occurred';
                      setCreateError(errorMsg);
                      toast({
                        title: 'Error',
                        description: errorMsg,
                        variant: 'destructive',
                      });
                    } finally {
                      setSavingAction(false);
                    }
                  }}
                  disabled={
                    savingAction ||
                    !createEmail ||
                    !createPassword ||
                    createPassword.length < 6 ||
                    !isValidEmail(createEmail)
                  }
                  className="min-w-[140px]"
                >
                  {savingAction ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Create User
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

