/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable compression for smaller payloads
  compress: true,
  // Optimize production builds
  reactStrictMode: true,
  // Power optimization for images
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
  },
  // Reduce bundle by externalizing server-only packages
  experimental: {
    optimizePackageImports: ['jspdf', 'jspdf-autotable', 'date-fns', 'qrcode'],
  },
};

export default nextConfig;
