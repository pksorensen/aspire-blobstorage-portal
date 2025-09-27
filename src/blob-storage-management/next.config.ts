import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Bundle analyzer for development
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Bundle analysis in development
    if (dev && process.env.ANALYZE === 'true') {
      try {
        const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
        config.plugins.push(new BundleAnalyzerPlugin({
          analyzerMode: 'server',
          openAnalyzer: true,
        }));
      } catch (error) {
        console.warn('Bundle analyzer plugin not available:', error instanceof Error ? error.message : 'Unknown error');
      }
    }

    // Bundle optimization
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        ...config.optimization.splitChunks,
        cacheGroups: {
          ...config.optimization.splitChunks?.cacheGroups,
          // Separate Azure SDK into its own chunk
          azure: {
            test: /[\\/]node_modules[\\/]@azure[\\/]/,
            name: 'azure-sdk',
            chunks: 'all',
            priority: 30,
            reuseExistingChunk: true,
          },
          // Separate Radix UI components
          radix: {
            test: /[\\/]node_modules[\\/]@radix-ui[\\/]/,
            name: 'radix-ui',
            chunks: 'all',
            priority: 25,
            reuseExistingChunk: true,
          },
          // Separate utility libraries
          utils: {
            test: /[\\/]node_modules[\\/](clsx|class-variance-authority|tailwind-merge)[\\/]/,
            name: 'utils',
            chunks: 'all',
            priority: 20,
            reuseExistingChunk: true,
          },
          // Default vendor chunk with higher priority for common dependencies
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendor',
            chunks: 'all',
            priority: 10,
            reuseExistingChunk: true,
          },
        },
      },
    };

    // Tree shaking optimization
    config.optimization.usedExports = true;
    config.optimization.sideEffects = false;

    // Add performance budgets in production
    if (!dev && !isServer) {
      config.performance = {
        maxAssetSize: 500000, // 500KB per asset
        maxEntrypointSize: 500000, // 500KB per entry point
        hints: 'warning',
      };
    }

    // Resolve Azure SDK compatibility issues
    config.resolve = {
      ...config.resolve,
      fallback: {
        ...config.resolve?.fallback,
        fs: false,
        stream: false,
        crypto: false,
      },
    };

    return config;
  },

  // Experimental features for better performance
  experimental: {
    // Enable optimizePackageImports for better tree shaking
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-avatar',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-collapsible',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-label',
      '@radix-ui/react-progress',
      '@radix-ui/react-select',
      '@radix-ui/react-separator',
      '@radix-ui/react-slot',
      '@radix-ui/react-tooltip',
    ],
  },


  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
  },

  // Compression
  compress: true,

  // Headers for better caching
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
      {
        source: '/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },

  // PoweredBy header removal for security
  poweredByHeader: false,

  // React strict mode for better development experience
  reactStrictMode: true,

  // TypeScript configuration
  typescript: {
    // Type checking is handled by tsc in CI/CD
    ignoreBuildErrors: false,
  },

  // ESLint configuration
  eslint: {
    // Linting is handled separately in CI/CD
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;
