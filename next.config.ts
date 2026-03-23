import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable React strict mode for better development experience
  reactStrictMode: true,

  // TypeScript configuration
  typescript: {
    ignoreBuildErrors: false,
  },

  // Disable image optimization for Cloudflare compatibility
  images: {
    unoptimized: true,
  },
};

export default nextConfig;