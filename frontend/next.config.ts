import type { NextConfig } from "next";

const backendUrl = process.env.BACKEND_URL;

if (!backendUrl && process.env.NODE_ENV === "production") {
  throw new Error("BACKEND_URL must be set for production builds.");
}

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl || "http://localhost:4000"}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
