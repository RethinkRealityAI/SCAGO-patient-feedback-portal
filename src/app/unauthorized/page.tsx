import { AlertCircle, Home } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { getServerSession, getAccessiblePages } from '@/lib/server-auth';

export default async function UnauthorizedPage() {
  const session = await getServerSession();

  // If not logged in, show login prompt
  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-background to-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle className="text-2xl font-bold">Access Denied</CardTitle>
            <CardDescription>
              You need to be logged in to access this area
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground">
              Please log in to continue.
            </p>

            <Link href="/login" className="block">
              <Button className="w-full">
                Go to Login
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { email, role } = session;
  const accessiblePages = await getAccessiblePages(email, role);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-background to-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle className="text-2xl font-bold">Access Denied</CardTitle>
          <CardDescription>
            You don't have permission to access this page
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              {role === 'participant' || role === 'mentor'
                ? 'This page is restricted to administrators.'
                : 'You don\'t have the required permissions for this page.'
              }
            </p>
          </div>

          {/* Show accessible pages based on role */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-center">
              You have access to:
            </p>

            {/* Participants and Mentors - Profile only */}
            {(role === 'participant' || role === 'mentor') && (
              <Link href="/profile" className="block">
                <Button variant="outline" className="w-full justify-start">
                  <Home className="mr-2 h-4 w-4" />
                  Your Profile
                </Button>
              </Link>
            )}

            {/* Admins and Super Admins - Show their accessible pages */}
            {(role === 'admin' || role === 'super-admin') && (
              <>
                {accessiblePages.length > 0 ? (
                  <div className="space-y-2">
                    {accessiblePages.map((page) => (
                      <Link key={page.key} href={page.route} className="block">
                        <Button variant="outline" className="w-full justify-start text-left">
                          <div className="flex flex-col items-start">
                            <span className="font-medium">{page.label}</span>
                            <span className="text-xs text-muted-foreground">
                              {page.description}
                            </span>
                          </div>
                        </Button>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      No admin pages have been assigned to your account.
                      Please contact your administrator to request access.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Back to Login option */}
          <div className="pt-4 border-t">
            <Link href="/login" className="block">
              <Button variant="ghost" className="w-full text-xs text-muted-foreground">
                Back to Login
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

