export const config = {
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN || '',
    channelId: process.env.TELEGRAM_CHANNEL_ID || '',
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  abstract: {
    rpcUrl: process.env.ABSTRACT_RPC_URL || 'https://api.testnet.abs.xyz',
    chainId: 11124, // Abstract testnet chain ID
    requiredTokenAddress: process.env.REQUIRED_TOKEN_ADDRESS || '0x1234567890123456789012345678901234567890',
  },
  app: {
    requiredTokenBalance: '1000000000000000000', // 1 token (18 decimals)
    cacheTimeout: 300000, // 5 minutes
    telegramPollInterval: 30000, // 30 seconds
  },
} as const;

export type Config = typeof config;