import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Export estático (FTP a cPanel). Genera ./out/ con `next build`.
  output: 'export',
  trailingSlash: true,
  /* config options here */
  images: {
    // El export estático no puede optimizar imágenes en runtime.
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'nakamabordados.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
        pathname: '/**',
      },
    ],
  },
  allowedDevOrigins: ['localhost', '192.168.0.241', '189.198.139.6','*.trycloudflare.com','*.localtunnel.me', '*'],
};

export default nextConfig;
