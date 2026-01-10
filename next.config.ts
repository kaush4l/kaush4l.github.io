import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  // Since we removed API routes, 'export' is safe again.
  // Workers might need 'output: standalone' or default.
  // Safe bet: Comment it out for dev stability.

  basePath: process.env.NODE_ENV === 'production' ? '/NextJS' : '',
  assetPrefix: process.env.NODE_ENV === 'production' ? '/NextJS/' : '',
  images: {
    unoptimized: true,
  },
  // Required for transformers.js compatibility
  serverExternalPackages: ['sharp', 'onnxruntime-node'],

  // Turbopack configuration (for dev mode)
  turbopack: {},

  // Webpack configuration for workers
  webpack: (config, { isServer, webpack }) => {
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
    // The `new Worker(new URL(...))` syntax is automatically detected by webpack
    // We need to ensure proper output configuration for workers
    if (!isServer) {
      config.output.globalObject = 'self';
    }

    return config;
  },

  // Required for SharedArrayBuffer support in WebGPU/Workers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
