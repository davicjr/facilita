import type { NextConfig } from "next";

const distDir = process.env.NEXT_DIST_DIR?.trim();

const nextConfig: NextConfig = {
  output: "standalone",
  ...(distDir ? { distDir } : {}),
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "3001",
        pathname: "/uploads/**",
      },
      {
        protocol: "http",
        hostname: "backend",
        port: "3001",
        pathname: "/uploads/**",
      },
    ],
  },
};

export default nextConfig;
