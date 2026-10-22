import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Upwork CSV exports for a year fit comfortably under this.
      bodySizeLimit: "5mb",
    },
  },
};

export default nextConfig;
