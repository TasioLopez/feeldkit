import type { NextConfig } from "next";

const corsOrigin = process.env.FEELDKIT_API_CORS_ORIGIN?.trim();

const nextConfig: NextConfig = {
  async headers() {
    if (!corsOrigin) {
      return [];
    }
    return [
      {
        source: "/api/v1/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: corsOrigin },
          { key: "Access-Control-Allow-Methods", value: "GET,POST,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, x-api-key, x-request-id" },
          { key: "Vary", value: "Origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
