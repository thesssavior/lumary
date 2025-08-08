const withNextIntl = require('next-intl/plugin')('./i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  // Move serverExternalPackages to top level (not experimental)
  serverExternalPackages: [],
  // Enable Turbopack (stable in Next.js 15.3+)
  turbopack: {},
  experimental: {
    // Helps prevent hydration issues
    optimizePackageImports: ['@/components', '@/hooks'],
    // Remove esmExternals as it's deprecated and not recommended
  },
  webpack: (config, { isServer }) => {
    config.resolve.alias.canvas = false;

    if (isServer && config.optimization?.splitChunks) {
      // Disable server-side vendor chunk splitting to prevent hydration mismatches
      config.optimization.splitChunks.cacheGroups = {
        default: false,
        vendors: false,
      };
    }

    // Prevent client-side imports of server-only modules
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }

    return config;
  },
  // Add React 19 specific settings
  compiler: {
    // Remove console.log in production
    removeConsole: process.env.NODE_ENV === 'production',
  },
};

module.exports = withNextIntl(nextConfig);
