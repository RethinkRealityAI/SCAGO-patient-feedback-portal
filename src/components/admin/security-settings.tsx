'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Lock, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { PagePermissionsManager } from '@/components/admin/page-permissions-manager';

export function SecuritySettings() {
  const securityChecks = [
    {
      name: 'Firestore Security Rules',
      status: 'manual',
      description: 'Check that security rules are properly configured',
      recommendation: 'Verify rules in Firebase Console → Firestore → Rules',
      critical: true,
    },
    {
      name: 'Admin-Only Access',
      status: 'enabled',
      description: 'Dashboard requires admin authentication',
      recommendation: 'Working as configured',
      critical: true,
    },
    {
      name: 'Public Sign-ups',
      status: 'disabled',
      description: 'Users cannot self-register',
      recommendation: 'Users must be created in Firebase Console',
      critical: true,
    },
    {
      name: 'Password Protection',
      status: 'enabled',
      description: 'Firebase Authentication enabled',
      recommendation: 'Users must login with valid credentials',
      critical: true,
    },
    {
      name: 'Rate Limiting',
      status: 'enabled',
      description: 'API endpoints have rate limiting',
      recommendation: '10 requests per minute per IP',
      critical: false,
    },
    {
      name: 'Input Validation',
      status: 'enabled',
      description: 'Form inputs are sanitized',
      recommendation: 'XSS and injection prevention active',
      critical: false,
    },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'enabled':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'disabled':
        return <XCircle className="h-5 w-5 text-green-500" />; // Green because this is intentional
      case 'manual':
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      default:
        return <Shield className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'enabled':
        return <Badge className="bg-green-500">Enabled</Badge>;
      case 'disabled':
        return <Badge className="bg-blue-500">Disabled</Badge>;
      case 'manual':
        return <Badge className="bg-amber-500">Manual Check</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Security Overview</CardTitle>
          <CardDescription>
            Security features and configurations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="mb-4">
            <Shield className="h-4 w-4" />
            <AlertDescription>
              <strong>Important:</strong> Verify Firestore security rules are published and correct.
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            {securityChecks.map((check) => (
              <div
                key={check.name}
                className="flex items-start gap-3 p-4 border rounded-lg"
              >
                <div className="mt-0.5">{getStatusIcon(check.status)}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold">{check.name}</p>
                    {check.critical && (
                      <Badge variant="outline" className="text-xs">
                        Critical
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {check.description}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {check.recommendation}
                  </p>
                </div>
                {getStatusBadge(check.status)}
              </div>
            ))}
          </div>

          <div className="mt-6 space-y-3 bg-muted/50 p-4 rounded-lg">
            <p className="font-semibold text-sm">Security Best Practices</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <Lock className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>Regularly rotate API keys and passwords</span>
              </li>
              <li className="flex gap-2">
                <Shield className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>Review and update Firestore security rules monthly</span>
              </li>
              <li className="flex gap-2">
                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>Monitor authentication logs for suspicious activity</span>
              </li>
              <li className="flex gap-2">
                <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>Test backup and restore procedures quarterly</span>
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Public Sign-up Configuration</CardTitle>
          <CardDescription>
            Self-registration is intentionally disabled
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Users <strong>cannot</strong> create their own accounts. All users must be created by administrators in the Firebase Console.
            </AlertDescription>
          </Alert>

          <div className="text-sm space-y-2 text-muted-foreground">
            <p className="font-semibold text-foreground">How to create user accounts:</p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Go to Firebase Console</li>
              <li>Navigate to Authentication → Users</li>
              <li>Click "Add user"</li>
              <li>Enter email and password</li>
              <li>Add to admin list if needed (User Management tab)</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      <PagePermissionsManager />
    </div>
  );
}

