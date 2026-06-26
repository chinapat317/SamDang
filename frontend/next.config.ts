import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  async rewrites() {
    return [
      {
        source: "/front-api/:path*",
        destination: `${process.env.FRONT_HANDLER_INTERNAL_URL || "http://frontHandler:8082"}/:path*`,
      },
    ];
  },
};

export default nextConfig;
