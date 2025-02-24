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
};

export default nextConfig;
