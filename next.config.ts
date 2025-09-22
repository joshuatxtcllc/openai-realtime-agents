import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@openai/agents'],
  },
  webpack: (config: any) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    
    // Fix for async storage issues
    config.resolve.alias = {
      ...config.resolve.alias,
      'next/dist/server/async-storage/static-generation-async-storage.external': false,
    };
    
    return config;
  },
  // Force dynamic rendering to avoid static generation issues
  output: 'standalone',
};

export default nextConfig;