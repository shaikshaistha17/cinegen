/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ["@google/generative-ai"],
  },
  // Enable SWC minification for better performance
  swcMinify: true,
  // Exclude scripts directory from compilation
  typescript: {
    ignoreBuildErrors: false,
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Make resend an optional dependency - ignore if not installed
      config.externals = [...(config.externals || []), 'resend'];
    }
    // Exclude scripts directory from bundle
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ['**/scripts/**', '**/node_modules/**'],
    };
    return config;
  },
};

export default nextConfig;
