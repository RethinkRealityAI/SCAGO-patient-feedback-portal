'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Info, Terminal } from 'lucide-react';

export default function SetupAdminPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-background p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Setup Super Admin Access</CardTitle>
          <CardDescription>
            Run the bootstrap script to set up your first super admin account
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Deprecation Notice */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Note:</strong> This page is for reference only. Admin setup is now done via the bootstrap script.
            </AlertDescription>
          </Alert>

          {/* Instructions */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Step 1: Create Your User Account</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                <li>Go to <code className="px-2 py-0.5 bg-muted rounded">/login</code></li>
                <li>Click "Register here"</li>
                <li>Create an account with your email</li>
              </ol>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Step 2: Run Bootstrap Script</h3>
              <div className="bg-muted p-4 rounded-lg">
                <div className="flex items-start gap-3">
                  <Terminal className="h-5 w-5 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm mb-2">Run this command in your terminal:</p>
                    <code className="block bg-background p-3 rounded text-sm font-mono">
                      node scripts/bootstrap-admin.js
                    </code>
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                This will set the super-admin role for tech@sicklecellanemia.ca (hardcoded in the script)
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Step 3: Login</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                <li>Logout if currently logged in</li>
                <li>Login again at <code className="px-2 py-0.5 bg-muted rounded">/login</code></li>
                <li>You'll be redirected to <code className="px-2 py-0.5 bg-muted rounded">/admin</code></li>
                <li>You now have full super admin access!</li>
              </ol>
            </div>
          </div>

          {/* Additional Help */}
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Troubleshooting:</strong> If you see "Access Denied", make sure:
              <ul className="list-disc list-inside mt-2 space-y-1 text-xs">
                <li>You created a user account first</li>
                <li>The bootstrap script ran successfully</li>
                <li>You logged out and back in after running the script</li>
                <li>Your email matches the one in the script (tech@sicklecellanemia.ca)</li>
              </ul>
            </AlertDescription>
          </Alert>

          {/* Documentation Link */}
          <div className="text-center text-sm text-muted-foreground">
            <p>
              For complete documentation, see{' '}
              <code className="px-2 py-0.5 bg-muted rounded">AUTH-SYSTEM-GUIDE.md</code>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
