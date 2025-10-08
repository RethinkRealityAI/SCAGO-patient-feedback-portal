'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, AlertCircle, RefreshCw, Activity } from 'lucide-react';

interface HealthCheck {
  name: string;
  status: 'up' | 'down' | 'degraded';
  message?: string;
  latency?: number;
}

export function SystemHealth() {
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lastCheck, setLastCheck] = useState<Date>(new Date());

  useEffect(() => {
    checkHealth();
  }, []);

  const checkHealth = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/health');
      const data = await response.json();
      setHealth(data);
      setLastCheck(new Date());
    } catch (error) {
      console.error('Health check failed:', error);
      setHealth({
        status: 'unhealthy',
        checks: {
          database: { status: 'down', error: 'Cannot reach health endpoint' },
        },
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'up':
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'degraded':
        return <AlertCircle className="h-5 w-5 text-amber-500" />;
      case 'down':
      case 'unhealthy':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Activity className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'up':
      case 'healthy':
        return <Badge className="bg-green-500">Healthy</Badge>;
      case 'degraded':
        return <Badge className="bg-amber-500">Degraded</Badge>;
      case 'down':
      case 'unhealthy':
        return <Badge variant="destructive">Unhealthy</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>System Health</CardTitle>
              <CardDescription>
                Real-time system status and performance metrics
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={checkHealth}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Overall Status */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                {getStatusIcon(health?.status || 'unknown')}
                <div>
                  <p className="font-semibold">Overall Status</p>
                  <p className="text-sm text-muted-foreground">
                    Last checked: {lastCheck.toLocaleTimeString()}
                  </p>
                </div>
              </div>
              {getStatusBadge(health?.status || 'unknown')}
            </div>

            {/* Individual Checks */}
            {health?.checks && (
              <div className="space-y-2">
                {Object.entries(health.checks).map(([key, check]: [string, any]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {getStatusIcon(check.status)}
                      <div>
                        <p className="font-medium capitalize">{key}</p>
                        {check.latency && (
                          <p className="text-xs text-muted-foreground">
                            Latency: {check.latency}ms
                          </p>
                        )}
                        {check.error && (
                          <p className="text-xs text-red-500">{check.error}</p>
                        )}
                        {check.usage !== undefined && (
                          <p className="text-xs text-muted-foreground">
                            Usage: {check.usage}%
                          </p>
                        )}
                        {check.missing && (
                          <p className="text-xs text-red-500">
                            Missing: {check.missing.join(', ')}
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge variant={check.status === 'up' ? 'default' : 'destructive'}>
                      {check.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}

            {/* Version Info */}
            {health?.version && (
              <div className="text-xs text-muted-foreground pt-4 border-t">
                Version: {health.version} • Timestamp: {health.timestamp}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

