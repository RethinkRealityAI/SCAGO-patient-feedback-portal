'use client';

import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ error, errorInfo });
    
    // Call the onError callback if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error!} resetError={this.resetError} />;
      }

      return (
        <div className="flex items-center justify-center min-h-[200px] p-6" role="alert" aria-live="polite">
          <Alert className="max-w-md">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            <AlertDescription className="space-y-3">
              <p>Something went wrong. Please try refreshing the page.</p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.location.reload()}
                  aria-label="Refresh the entire page"
                >
                  <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
                  Refresh Page
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={this.resetError}
                  aria-label="Try to reload the component"
                >
                  Try Again
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook for functional components to trigger error boundary
export function useErrorHandler() {
  return (error: Error, errorInfo?: React.ErrorInfo) => {
    throw error;
  };
}
