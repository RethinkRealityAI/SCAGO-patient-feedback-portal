'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mail, CheckCircle, AlertTriangle } from 'lucide-react';

export default function AuthCompletePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [needsEmail, setNeedsEmail] = useState(false);

  useEffect(() => {
    // Check if this is a valid sign-in link
    if (isSignInWithEmailLink(auth, window.location.href)) {
      // Try to get email from localStorage
      const storedEmail = window.localStorage.getItem('emailForSignIn');
      
      if (storedEmail) {
        // Automatically sign in with stored email
        handleSignIn(storedEmail);
      } else {
        // Need to ask for email
        setNeedsEmail(true);
        setIsLoading(false);
      }
    } else {
      setError('Invalid sign-in link. Please request a new one.');
      setIsLoading(false);
    }
  }, []);

  const handleSignIn = async (emailToUse: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // Sign in with email link
      const result = await signInWithEmailLink(auth, emailToUse, window.location.href);
      
      // Clear email from localStorage
      window.localStorage.removeItem('emailForSignIn');
      
      setSuccess(true);
      
      // Redirect to profile or dashboard after a brief success message
      setTimeout(() => {
        // Check if user needs to complete profile
        router.push('/profile');
      }, 1500);
    } catch (err: any) {
      console.error('Sign-in error:', err);
      
      let errorMessage = 'Failed to sign in. Please try again.';
      
      if (err.code === 'auth/invalid-action-code') {
        errorMessage = 'This link has expired or has already been used. Please request a new one.';
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address. Please check and try again.';
      }
      
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      handleSignIn(email.trim());
    }
  };

  if (isLoading && !needsEmail) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-lg font-medium">Completing sign-in...</p>
              <p className="text-sm text-muted-foreground text-center">
                Please wait while we verify your email link
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="p-4 bg-green-100 dark:bg-green-900/20 rounded-full">
                <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400" />
              </div>
              <p className="text-lg font-medium">Sign-in successful!</p>
              <p className="text-sm text-muted-foreground text-center">
                Redirecting you to your profile...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Complete Sign-In
          </CardTitle>
          <CardDescription>
            {needsEmail 
              ? 'Please enter your email address to complete sign-in'
              : 'Verifying your sign-in link'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {needsEmail && (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  Email Address
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground">
                  Enter the email address where you received the sign-in link
                </p>
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading || !email.trim()}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Complete Sign-In'
                )}
              </Button>
            </form>
          )}

          {error && (
            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground text-center mb-2">
                Need help?
              </p>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push('/login')}
              >
                Request a New Link
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
















