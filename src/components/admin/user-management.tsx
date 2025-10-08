'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { UserPlus, Trash2, Shield, ShieldOff, AlertCircle, CheckCircle, Search, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getAdminEmails, addAdminEmail, removeAdminEmail } from '@/lib/admin-actions';

interface AdminUser {
  email: string;
  addedAt?: Date;
}

export function UserManagement() {
  const [adminEmails, setAdminEmails] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState('');
  const [adding, setAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    loadAdmins();
  }, []);

  const loadAdmins = async () => {
    setLoading(true);
    const result = await getAdminEmails();
    if (result.emails) {
      setAdminEmails(result.emails);
    } else if (result.error) {
      toast({
        title: 'Error Loading Admins',
        description: result.error,
        variant: 'destructive',
      });
    }
    setLoading(false);
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

    if (adminEmails.includes(newEmail)) {
      toast({
        title: 'Already Admin',
        description: 'This email already has admin access',
        variant: 'destructive',
      });
      return;
    }

    setAdding(true);
    const result = await addAdminEmail(newEmail);
    
    if (result.success) {
      setAdminEmails([...adminEmails, newEmail]);
      setNewEmail('');
      toast({
        title: 'Admin Added',
        description: `${newEmail} now has admin access`,
      });
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to add admin',
        variant: 'destructive',
      });
    }
    setAdding(false);
  };

  const handleRemoveAdmin = async (email: string) => {
    if (adminEmails.length === 1) {
      toast({
        title: 'Cannot Remove',
        description: 'You must have at least one admin',
        variant: 'destructive',
      });
      return;
    }

    const result = await removeAdminEmail(email);
    
    if (result.success) {
      setAdminEmails(adminEmails.filter(e => e !== email));
      toast({
        title: 'Admin Removed',
        description: `${email} no longer has admin access`,
      });
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to remove admin',
        variant: 'destructive',
      });
    }
  };

  const filteredEmails = adminEmails.filter(email =>
    email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>User Management</CardTitle>
              <CardDescription>
                Manage admin users and permissions
              </CardDescription>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add Admin
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Admin User</DialogTitle>
                  <DialogDescription>
                    Grant admin access to a user. They must have an account in Firebase Authentication.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Important:</strong> The user must already exist in Firebase Authentication. Create their account first in the Firebase Console.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Admin Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="admin@example.com"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleAddAdmin();
                        }
                      }}
                    />
                  </div>
                  
                  <Button
                    onClick={handleAddAdmin}
                    disabled={adding || !newEmail}
                    className="w-full"
                  >
                    {adding ? 'Adding...' : 'Add Admin Access'}
                  </Button>

                  <div className="text-xs text-muted-foreground border-t pt-4">
                    <p className="font-semibold mb-2">How to create user accounts:</p>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Go to Firebase Console</li>
                      <li>Navigate to Authentication → Users</li>
                      <li>Click "Add user"</li>
                      <li>Enter email and password</li>
                      <li>Then add their email here</li>
                    </ol>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search admins..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading admins...
            </div>
          ) : filteredEmails.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? 'No admins found' : 'No admins configured'}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredEmails.map((email) => (
                <div
                  key={email}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-full">
                      <Shield className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{email}</p>
                      <p className="text-xs text-muted-foreground">Admin Access</p>
                    </div>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveAdmin(email)}
                    disabled={adminEmails.length === 1}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Important Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="flex gap-2">
            <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-foreground">User Account Creation</p>
              <p>Users cannot sign up themselves. You must create their accounts in the Firebase Console first.</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Shield className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-foreground">Admin Permissions</p>
              <p>Admins can access the dashboard, editor, and all admin features. Regular users cannot access the admin panel.</p>
            </div>
          </div>

          <div className="flex gap-2">
            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-foreground">Security</p>
              <p>All admin checks are enforced by Firestore security rules on the server side.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

