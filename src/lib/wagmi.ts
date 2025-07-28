import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { defineChain } from 'viem';
import { config } from './config';

// Abstract Testnet chain configuration
export const abstractTestnet = defineChain({
  id: 11124,
  name: 'Abstract Testnet',
  network: 'abstract-testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'ETH',
    symbol: 'ETH',
  },
  rpcUrls: {
    public: { http: [config.abstract.rpcUrl] },
    default: { http: [config.abstract.rpcUrl] },
  },
  blockExplorers: {
    default: { name: 'Abstract Explorer', url: 'https://explorer.testnet.abs.xyz' },
  },
  testnet: true,
});

export const wagmiConfig = getDefaultConfig({
  appName: 'Abstract Token Dashboard',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '0000000000000000000000000000000000000000',
  chains: [abstractTestnet],
  ssr: true,
});

export { abstractTestnet as defaultChain };