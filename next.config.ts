import type {NextConfig} from 'next';

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
  // Exclude server-only AI modules from client bundle
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Externalize AI/Genkit packages to prevent them from being bundled in client-side code
      config.externals = config.externals || [];
      config.externals.push({
        'genkit': 'commonjs genkit',
        '@genkit-ai/googleai': 'commonjs @genkit-ai/googleai',
        '@genkit-ai/next': 'commonjs @genkit-ai/next',
      });
      
      // Add aliases to prevent client-side imports
      config.resolve.alias = {
        ...config.resolve.alias,
        '@/ai/genkit$': false,
        '@/ai/flows/analyze-feedback-flow$': false,
        '@/ai/flows/chat-with-data-flow$': false,
        '@/ai/flows/generate-report-flow$': false,
        '@/ai/flows/csv-participant-mapper-flow$': false,
        '@/ai/flows/rsc-chat-flow$': false,
      };
    }
    return config;
  },
};

export default nextConfig;
