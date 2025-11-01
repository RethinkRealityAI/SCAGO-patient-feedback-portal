'use client';

import { useState, FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn, resetPassword, getUserRole } from '@/lib/firebase-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock, Mail, Loader2, AlertCircle, CheckCircle } from 'lucide-react';

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  
  // Get the redirect URL from query parameters
  const redirectUrl = searchParams.get('redirect');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (resetMode) {
      // Password reset flow
      const result = await resetPassword(email);
      setLoading(false);

      if (result.error) {
        setError(result.error);
      } else {
        setSuccess('Password reset email sent! Check your inbox.');
        setEmail('');
        // Switch back to login mode after a delay
        setTimeout(() => setResetMode(false), 3000);
      }
    } else {
      // Login flow
      const result = await signIn(email, password);
      
      if (result.error) {
        setLoading(false);
        setError(result.error);
        setPassword('');
      } else if (result.user) {
        const userEmail = result.user.email;
        if (!userEmail) {
          setLoading(false);
          setError('No email found for user');
          return;
        }

        // Create server session cookie immediately to avoid race conditions
        try {
          // Force refresh the ID token to ensure latest claims
          const idToken = await result.user.getIdToken(true);
          const sessionResponse = await fetch('/api/auth/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken }),
          });
          
          // Ensure session cookie is set before proceeding
          if (!sessionResponse.ok) {
            console.error('Failed to create session cookie');
          }
          
          // Wait longer to ensure cookie is fully set and available for next request
          // The cookie needs to be in the response headers before navigation
          await new Promise(resolve => setTimeout(resolve, 300));
        } catch (error) {
          console.error('Error creating session:', error);
        }

        // Check user role - use direct email check since auth.currentUser might not be ready
        let role: 'admin' | 'yep-manager' | 'user' | null = null;
        try {
          // First try with getUserRole (checks custom claims + Firestore)
          role = await getUserRole(userEmail);
          console.log('[Login] Initial getUserRole result:', role);
          
          // If role is still null or 'user', double-check by directly querying Firestore
          if (!role || role === 'user') {
            const { isUserAdmin, isUserYEPManager } = await import('@/lib/firebase-auth');
            const [isAdmin, isYEPManager] = await Promise.all([
              isUserAdmin(userEmail),
              isUserYEPManager(userEmail)
            ]);
            
            console.log('[Login] Direct Firestore check - isAdmin:', isAdmin, 'isYEPManager:', isYEPManager);
            
            if (isAdmin) {
              role = 'admin';
            } else if (isYEPManager) {
              role = 'yep-manager';
            } else {
              role = 'user';
            }
          }
          
          // Verify with server-side check if possible
          try {
            const debugResponse = await fetch(`/api/auth/debug-role?email=${encodeURIComponent(userEmail)}`);
            const debugData = await debugResponse.json();
            console.log('[Login] Server-side role check:', debugData);
            
            // If server says admin but client says user, trust server
            if (debugData.firestoreCheck?.isInAdminList && role !== 'admin') {
              console.warn('[Login] Server confirms admin but client detected user - using admin');
              role = 'admin';
            }
          } catch (debugError) {
            console.warn('[Login] Could not verify with server:', debugError);
          }
          
          console.log('[Login] Final role decision:', role, 'for email:', userEmail);
        } catch (error) {
          console.error('[Login] Error detecting user role:', error);
          // Default to user role on error
          role = 'user';
        }

        if (redirectUrl) {
          const destination = decodeURIComponent(redirectUrl);
          const safeDestination = destination.startsWith('/') && !destination.includes('..') ? destination : '/admin';
          console.log('Redirecting to:', safeDestination, 'from redirect parameter');
          router.replace(safeDestination);
          return;
        }

        if (role === 'admin') {
          console.log('Admin detected, redirecting to /admin');
          // Use window.location for full page reload to ensure cookies are sent
          window.location.href = '/admin';
          return;
        }

        if (role === 'yep-manager') {
          console.log('YEP Manager detected, redirecting to /youth-empowerment');
          window.location.href = '/youth-empowerment';
          return;
        }

        console.log('Regular user detected, redirecting to /profile');
        router.replace('/profile');
        return;
      } else {
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">
            {resetMode ? 'Reset Password' : 'Youth Empowerment Portal'}
          </CardTitle>
          <CardDescription>
            {resetMode 
              ? 'Enter your email to receive a password reset link'
              : 'Sign in to access your portal'
            }
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Error Alert */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Success Alert */}
            {success && (
              <Alert className="border-green-500 text-green-700 bg-green-50">
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="your-email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password Field (only in login mode) */}
            {!resetMode && (
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                    disabled={loading}
                  />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {resetMode ? 'Sending...' : 'Signing in...'}
                </>
              ) : (
                resetMode ? 'Send Reset Link' : 'Sign In'
              )}
            </Button>

            {/* Toggle Reset Mode */}
            <div className="text-center">
              <Button
                type="button"
                variant="link"
                className="text-sm text-muted-foreground hover:text-primary"
                onClick={() => {
                  setResetMode(!resetMode);
                  setError('');
                  setSuccess('');
                  setPassword('');
                }}
                disabled={loading}
              >
                {resetMode ? 'Back to login' : 'Forgot password?'}
              </Button>
            </div>
          </form>

          {/* Help Text */}
          <div className="mt-6 text-center space-y-2">
            <div className="pt-2">
              <p className="text-sm text-muted-foreground">
                Don't have an account?{' '}
                <Button
                  variant="link"
                  onClick={() => router.push('/yep-register')}
                  className="p-0 h-auto font-medium"
                  type="button"
                >
                  Register here
                </Button>
              </p>
            </div>
            <p className="text-xs text-muted-foreground pt-2 border-t">
              Need help? Contact your program administrator
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

