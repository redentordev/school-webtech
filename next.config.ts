import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    domains: [
      'res.cloudinary.com',
      'picsum.photos',
      'via.placeholder.com',
      'images.unsplash.com',
      'source.unsplash.com',
      'hebbkx1anhila5yf.public.blob.vercel-storage.com'
    ],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
