import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  turbopack: {
    root: path.resolve(__dirname, "../.."),
  },
  async redirects() {
    return [
      // Old homepage card links → new routes
      { source: "/lend", destination: "/earn/supply", permanent: false },
      { source: "/earn", destination: "/earn/supply", permanent: false },
      // Note: /borrow already exists as (borrow)/borrow/page.tsx which redirects to /borrow/lending
    ];
  },
};

export default nextConfig;
