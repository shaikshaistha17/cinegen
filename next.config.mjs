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
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Make resend an optional dependency - ignore if not installed
      config.externals = [...(config.externals || []), 'resend'];
    }
    return config;
  },
};

export default nextConfig;
