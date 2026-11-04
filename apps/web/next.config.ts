import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  agentRules: false,
  devIndicators: false,
  allowedDevOrigins: ["localhost", "127.0.0.1"],
  transpilePackages: ["@videoagent/landing"],
};

export default withNextIntl(nextConfig);

