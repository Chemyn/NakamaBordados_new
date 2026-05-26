import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  /* config options here */
  // @ts-ignore - Dev origins for HMR over port forwarding
  allowedDevOrigins: ['localhost', '192.168.0.241', '189.198.139.6', '*'],
};

export default nextConfig;
