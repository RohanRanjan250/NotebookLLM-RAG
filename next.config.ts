import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow network access for local testing (HMR)
  allowedDevOrigins: ['192.168.8.4'],
};

export default nextConfig;
