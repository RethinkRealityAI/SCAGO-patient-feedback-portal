'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  UserPlus, Trash2, Shield, Eye, Clock, Activity,
  Search, Mail, Calendar, LogIn, AlertTriangle 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getAllUsers, getUserActivityLogs, getUserLoginHistory, markUserAsDeleted, type FirebaseUser, type UserActivity } from '@/lib/firebase-admin-users';
import { getAdminEmails, addAdminEmail, removeAdminEmail } from '@/lib/admin-actions';

export function EnhancedUserManagement() {
  const [users, setUsers] = useState<FirebaseUser[]>([]);
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<FirebaseUser | null>(null);
  const [userLogins, setUserLogins] = useState<Date[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    
    // Load users
    const usersResult = await getAllUsers();
    if (usersResult.users) {
      setUsers(usersResult.users);
    }

    // Load activity logs
    const activityResult = await getUserActivityLogs(50);
    if (activityResult.activities) {
      setActivities(activityResult.activities);
    }

    setLoading(false);
  };

  const handleViewUser = async (user: FirebaseUser) => {
    setSelectedUser(user);
    
    // Load user's login history
    const result = await getUserLoginHistory(user.email);
    if (result.logins) {
      setUserLogins(result.logins);
    }
  };

  const handleDeleteUser = async (user: FirebaseUser) => {
    if (!confirm(`Are you sure you want to delete ${user.email}? This will remove their admin access.`)) {
      return;
    }

    const result = await markUserAsDeleted(user.email);
    
    if (result.success) {
      toast({
        title: 'User Deleted',
        description: `${user.email} has been removed`,
      });
      loadData();
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to delete user',
        variant: 'destructive',
      });
    }
  };

  const handleAddAdmin = async () => {
    if (!newEmail || !newEmail.includes('@')) {
      toast({
        title: 'Invalid Email',
        description: 'Please enter a valid email address',
        variant: 'destructive',
      });
      return;
    }

    // Get current user's email from auth context if available
    const { auth } = await import('@/lib/firebase');
    const currentUserEmail = auth.currentUser?.email || 'system';

    const result = await addAdminEmail(newEmail, currentUserEmail);
    
    if (result.success) {
      toast({
        title: 'Admin Added',
        description: `${newEmail} now has admin access`,
      });
      setNewEmail('');
      loadData();
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to add admin',
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
                        {user.isAdmin ? (
                          <Shield className="h-4 w-4 text-primary" />
                        ) : (
                          <Mail className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{user.email}</p>
                          {user.isAdmin && <Badge>Admin</Badge>}
                          {user.disabled && <Badge variant="destructive">Disabled</Badge>}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Created: {user.createdAt.toLocaleDateString()}
                          </span>
                          {user.lastLoginAt && (
                            <span className="flex items-center gap-1">
                              <LogIn className="h-3 w-3" />
                              Last login: {user.lastLoginAt.toLocaleDateString()}
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

        {/* User Details Dialog */}
        <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>User Details</DialogTitle>
              <DialogDescription>
                Detailed information for {selectedUser?.email}
              </DialogDescription>
            </DialogHeader>
            {selectedUser && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium">Email</p>
                    <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">User ID</p>
                    <p className="text-sm text-muted-foreground font-mono text-xs">{selectedUser.uid}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Created</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedUser.createdAt.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Last Login</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedUser.lastLoginAt?.toLocaleString() || 'Never'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Status</p>
                    <Badge variant={selectedUser.disabled ? 'destructive' : 'default'}>
                      {selectedUser.disabled ? 'Disabled' : 'Active'}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Role</p>
                    <Badge>{selectedUser.isAdmin ? 'Admin' : 'User'}</Badge>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium mb-2">Permissions</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Shield className="h-4 w-4 text-green-500" />
                      Dashboard Access
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Shield className="h-4 w-4 text-green-500" />
                      Editor Access
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Shield className="h-4 w-4 text-green-500" />
                      Admin Panel
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Shield className="h-4 w-4 text-green-500" />
                      View Reports
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium mb-2">Recent Logins ({userLogins.length})</p>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {userLogins.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No login history</p>
                    ) : (
                      userLogins.map((login, index) => (
                        <div key={index} className="text-sm text-muted-foreground flex items-center gap-2">
                          <Clock className="h-3 w-3" />
                          {login.toLocaleString()}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
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
            <CardTitle>Create New User</CardTitle>
            <CardDescription>
              Add a new user to the platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6">
              <div className="flex gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-amber-900 dark:text-amber-100 mb-1">
                    Important: Use Firebase Console
                  </p>
                  <p className="text-amber-800 dark:text-amber-200">
                    To create user accounts, you must use the Firebase Console. This ensures proper authentication setup and security.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-muted/50 p-6 rounded-lg space-y-4">
                <h3 className="font-semibold">How to Create a User Account:</h3>
                <ol className="space-y-3 text-sm">
                  <li className="flex gap-3">
                    <span className="font-bold text-primary">1.</span>
                    <span>Go to <a href="https://console.firebase.google.com/project/scago-feedback/authentication/users" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Firebase Console → Authentication → Users</a></span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-bold text-primary">2.</span>
                    <span>Click the <strong>"Add user"</strong> button</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-bold text-primary">3.</span>
                    <span>Enter the user's email address and a secure password</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-bold text-primary">4.</span>
                    <span>Click <strong>"Add user"</strong> to create the account</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-bold text-primary">5.</span>
                    <span>Return here to grant admin access if needed (below)</span>
                  </li>
                </ol>
              </div>

              <div className="border-t pt-6">
                <h3 className="font-semibold mb-4">Grant Admin Access</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  After creating a user in Firebase Console, you can grant them admin access here:
                </p>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="user@example.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddAdmin()}
                  />
                  <Button onClick={handleAddAdmin} disabled={!newEmail}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Admin
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

