import type { NextConfig } from "next";

const corsOrigin = process.env.FEELDKIT_API_CORS_ORIGIN?.trim();
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
  },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
];

const nextConfig: NextConfig = {
  async headers() {
    const rules: Awaited<ReturnType<NonNullable<NextConfig["headers"]>>> = [
      {
        source: "/dashboard/:path*",
        headers: securityHeaders,
      },
      {
        source: "/login",
        headers: securityHeaders,
      },
      {
        source: "/auth/:path*",
        headers: securityHeaders,
      },
    ];
    if (!corsOrigin) {
      return rules;
    }
    rules.push(
      {
        source: "/api/v1/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: corsOrigin },
          { key: "Access-Control-Allow-Methods", value: "GET,POST,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, x-api-key, x-request-id" },
          { key: "Vary", value: "Origin" },
        ],
      },
    );
    return rules;
  },
};

export default nextConfig;
