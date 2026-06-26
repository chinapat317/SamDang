/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["unexalted-yessenia-unparalleled.ngrok-free.dev"],
  async rewrites() {
    return [
      {
        source: "/front-api/:path*",
        destination: `${process.env.FRONT_HANDLER_INTERNAL_URL || "http://frontHandler:8082"}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
