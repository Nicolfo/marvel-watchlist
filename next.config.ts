import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emits .next/standalone so the Docker image can run without node_modules.
  output: "standalone",
  reactStrictMode: true,
};

export default nextConfig;
