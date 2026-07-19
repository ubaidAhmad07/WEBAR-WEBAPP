import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3", "sharp"],
  turbopack: {
    // mind-ar's bundled tfjs has runtime-guarded require("fs") calls that
    // never execute in the browser — stub them out for client bundles.
    resolveAlias: {
      fs: { browser: "./lib/empty-stub.js" },
    },
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = { ...config.resolve.fallback, fs: false };
    }
    return config;
  },
};

export default nextConfig;
