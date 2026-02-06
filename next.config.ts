import path from 'path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // Server-only module exclusion (prevents bundling on server, but allows server-side usage)
  // Note: This tells Next.js these packages should be externalized on the server
  // For client exclusion, we use webpack fallbacks and Turbopack aliases
  serverExternalPackages: [
    'genkit',
    '@genkit-ai/googleai',
    '@genkit-ai/next',
    'firebase-admin',
    '@google-cloud/storage',
    'google-auth-library',
    'gcp-metadata',
    'gtoken',
    'teeny-request',
    '@firebase/database-compat',
    'agent-base',
    'http-proxy-agent',
    'https-proxy-agent',
    'nodemailer',
  ],
  // Exclude server-only modules from client bundle
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Exclude Node.js built-in modules from client bundle
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        http2: false,
        child_process: false,
        crypto: false,
        stream: false,
        path: false,
        os: false,
        util: false,
      };

      // Add aliases to prevent client-side imports of AI and server-only code
      config.resolve.alias = {
        ...config.resolve.alias,
        'firebase-admin': false,
        '@google-cloud/storage': false,
        'google-auth-library': false,
        'gcp-metadata': false,
        'gtoken': false,
        'teeny-request': false,
        '@firebase/database-compat': false,
        'agent-base': false,
        'http-proxy-agent': false,
        'https-proxy-agent': false,
        '@/ai/genkit$': false,
        '@/ai/client$': false,
        '@/ai/dev$': false,
        '@/ai/flows/analyze-feedback-flow$': false,
        '@/ai/flows/chat-with-data-flow$': false,
        '@/ai/flows/generate-report-flow$': false,
        '@/ai/flows/csv-participant-mapper-flow$': false,
        '@/ai/flows/rsc-chat-flow$': false,
        '@/ai/utils$': false,
      };
    }
    return config;
  },
  // Turbopack configuration (for Next.js 15)
  // Note: serverExternalPackages handles most server-only exclusions
  // Turbopack respects serverExternalPackages automatically
  // The webpack config above handles client-side exclusion when webpack is used
};

export default nextConfig;
