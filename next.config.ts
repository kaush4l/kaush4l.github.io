import type { NextConfig } from "next";

const repo = process.env.GITHUB_REPOSITORY?.split('/')[1];
const isUserPagesRepo = !!repo && repo.endsWith('.github.io');
const inferredBasePath = !repo || isUserPagesRepo ? '' : `/${repo}`;
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? inferredBasePath;

const nextConfig: NextConfig = {
  output: 'export',

  // Ensure exported routes work on static hosts without rewrite rules (e.g. GitHub Pages)
  // by generating /route/index.html instead of /route.html.
  trailingSlash: true,

  // GitHub Pages: project pages are served from /<repo>/, user pages from /
  basePath,
  ...(basePath ? { assetPrefix: `${basePath}/` } : {}),

  images: {
    unoptimized: true,
  },

  // Required for transformers.js compatibility
  serverExternalPackages: ['sharp', 'onnxruntime-node'],

  // Turbopack configuration (for dev mode)
  turbopack: {},

  // Webpack configuration for workers
  webpack: (config, { isServer }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "sharp$": false,
      "onnxruntime-node$": false,
    };
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
    };

    // Enable native worker support in webpack 5
    if (!isServer) {
      config.output.globalObject = 'self';
    }

    return config;
  },
};

export default nextConfig;
