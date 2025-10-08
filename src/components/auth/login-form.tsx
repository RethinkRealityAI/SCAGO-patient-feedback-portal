'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { signIn, resetPassword } from '@/lib/firebase-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock, Mail, Loader2, AlertCircle, CheckCircle } from 'lucide-react';

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetMode, setResetMode] = useState(false);

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
      setLoading(false);

      if (result.error) {
        setError(result.error);
        setPassword('');
      } else {
        // AuthProvider will handle redirect
        router.push('/dashboard');
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
            {resetMode ? 'Reset Password' : 'Admin Login'}
          </CardTitle>
          <CardDescription>
            {resetMode 
              ? 'Enter your email to receive a password reset link'
              : 'Sign in to access the dashboard'
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
                  placeholder="admin@example.com"
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
          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p>Need access? Contact your administrator</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

