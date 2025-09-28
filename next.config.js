/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@openai/agents'],
  },
  webpack: (config, { isServer }) => {
    // Only apply client-side fixes
    if (!isServer) {
      // Prevent server-side async storage from being bundled on client
      config.resolve.alias = {
        ...config.resolve.alias,
        'async_hooks': false,
        'next/dist/server/async-storage/static-generation-async-storage.external': false,
        'next/dist/client/components/request-async-storage.external': false,
        'next/dist/client/components/static-generation-async-storage.external': false,
        'next/dist/server/app-render/work-unit-async-storage.external': false,
        'next/dist/server/app-render/work-async-storage.external': false,
      };
    }
    
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      async_hooks: false,
    };
    
    return config;
  },
  // Force dynamic rendering to avoid static generation issues
  output: 'standalone',
};

module.exports = nextConfig;