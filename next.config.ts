import type { NextConfig } from "next";

const repo = process.env.GITHUB_REPOSITORY?.split('/')[1];
const isUserPagesRepo = !!repo && repo.endsWith('.github.io');
const inferredBasePath = !repo || isUserPagesRepo ? '' : `/${repo}`;
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? inferredBasePath;

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  basePath,
  ...(basePath ? { assetPrefix: `${basePath}/` } : {}),
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
