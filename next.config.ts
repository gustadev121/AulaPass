import withFlowbiteReact from "flowbite-react/plugin/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: [
          "**/.direnv/**",
          "**/node_modules/**",
          "**/.next/**",
        ],
      };
    }
    return config;
  },
};

export default withFlowbiteReact(nextConfig);
