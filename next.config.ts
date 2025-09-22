import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@openai/agents'],
  },
  webpack: (config: any, { isServer }) => {
    // Apply these aliases only for client-side bundles
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        'next/dist/server/async-storage/static-generation-async-storage.external': false,
        'next/dist/client/components/request-async-storage.external': false,
        'next/dist/client/components/static-generation-async-storage.external': false,
        'next/dist/compiled/next-server/app-utils.runtime.prod': false,
        'next/dist/compiled/next-server/app-utils.runtime.dev': false,
      };
    }
    
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    
    return config;
  },
  // Force dynamic rendering to avoid static generation issues
  output: 'standalone',
};

export default nextConfig;