/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  // Disable automatic static optimization for error pages
  output: 'standalone',
}

module.exports = nextConfig
