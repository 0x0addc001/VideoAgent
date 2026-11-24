import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  output: process.env.NEXT_STATIC_EXPORT === "1" ? "export" : undefined,
  trailingSlash: process.env.NEXT_STATIC_EXPORT === "1",
  basePath:
    process.env.NEXT_STATIC_EXPORT === "1" ? "/VideoAgent" : undefined,
  images: { unoptimized: true },
  reactStrictMode: true,
  poweredByHeader: false,
  agentRules: false,
  devIndicators: false,
  allowedDevOrigins: ["localhost", "127.0.0.1"],
  transpilePackages: ["@videoagent/landing"],
};

export default withNextIntl(nextConfig);

