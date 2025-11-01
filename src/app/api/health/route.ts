import { NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  checks: {
    database: { status: 'up' | 'down'; latency?: number; error?: string };
    environment: { status: 'up' | 'down'; missing?: string[] };
    memory?: { status: 'up' | 'degraded'; usage?: number };
  };
}

export async function GET() {
  const startTime = Date.now();
  const result: HealthCheckResult = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    checks: {
      database: { status: 'up' },
      environment: { status: 'up' },
    },
  };

  // Check database connectivity
  try {
    const dbStart = Date.now();
    const firestore = getAdminFirestore();
    await firestore.collection('surveys').limit(1).get();
    const dbLatency = Date.now() - dbStart;
    
    result.checks.database = {
      status: 'up',
      latency: dbLatency,
    };

    if (dbLatency > 2000) {
      result.status = 'degraded';
    }
  } catch (error) {
    result.checks.database = {
      status: 'down',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    result.status = 'unhealthy';
  }

  // Check required environment variables
  const requiredEnvVars = [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'GOOGLE_API_KEY',
  ];

  // Validate environment variables without logging sensitive data
  // Note: Only log presence/absence, never log actual values or patterns

  const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingEnvVars.length > 0) {
    result.checks.environment = {
      status: 'down',
      missing: missingEnvVars,
    };
    result.status = 'unhealthy';
  }

  // Check memory usage (Node.js only)
  if (typeof process !== 'undefined' && process.memoryUsage) {
    const memUsage = process.memoryUsage();
    const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
    const heapTotalMB = memUsage.heapTotal / 1024 / 1024;
    const usagePercent = (heapUsedMB / heapTotalMB) * 100;

    result.checks.memory = {
      status: usagePercent > 90 ? 'degraded' : 'up',
      usage: Math.round(usagePercent),
    };

    if (usagePercent > 90) {
      result.status = 'degraded';
    }
  }

  const statusCode = result.status === 'healthy' ? 200 : result.status === 'degraded' ? 200 : 503;

  return NextResponse.json(result, {
    status: statusCode,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'X-Response-Time': `${Date.now() - startTime}ms`,
    },
  });
}

