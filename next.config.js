/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  webpack: (config) => {
    config.resolve.fallback = {
      fs: false,
      net: false,
      tls: false,
    }
    config.externals.push('pino-pretty', 'lokijs', 'encoding')
    return config
  },
  // Optional environment variables for production
  env: {
    REDIS_URL: process.env.REDIS_URL || '',
    ABSTRACT_RPC_URL: process.env.ABSTRACT_RPC_URL || 'https://api.testnet.abs.xyz',
  },
}

module.exports = nextConfig