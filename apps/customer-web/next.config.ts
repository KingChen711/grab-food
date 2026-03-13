import type { NextConfig } from 'next'

const config: NextConfig = {
  transpilePackages: ['@grab/ui', '@grab/types'],
  experimental: {
    optimizePackageImports: ['@grab/ui'],
  },
  typedRoutes: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.googleusercontent.com' },
      { protocol: 'http', hostname: 'localhost' },
    ],
  },
}

export default config
