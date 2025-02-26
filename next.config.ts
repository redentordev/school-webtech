import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    domains: [
      'picsum.photos',
      'picwall-webtech.s3.us-east-1.amazonaws.com',
      "avatars.githubusercontent.com",
      "lh3.googleusercontent.com"
    ],
    formats: ['image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.amazonaws.com'
      }
    ],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384, 512, 1024],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
