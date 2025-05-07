const withNextIntl = require('next-intl/plugin')('./i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  webpack: (config, { isServer }) => {
    config.resolve.alias.canvas = false;

    if (isServer && config.optimization?.splitChunks) {
      // Disable server-side vendor chunk splitting
      config.optimization.splitChunks.cacheGroups = {
        default: false,
        vendors: false,
      };
    }
    return config;
  },
};

module.exports = withNextIntl(nextConfig);
