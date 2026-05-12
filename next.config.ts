import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['@huggingface/transformers'],
  turbopack: {
    root: __dirname,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
