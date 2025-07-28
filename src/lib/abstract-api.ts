import { createPublicClient, http, parseAbiItem } from 'viem';
import { abstractTestnet } from 'viem/chains';

// Abstract L2 configuration
const abstract = {
  id: 11124,
  name: 'Abstract Testnet',
  network: 'abstract-testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: { http: ['https://api.testnet.abs.xyz'] },
    public: { http: ['https://api.testnet.abs.xyz'] },
  },
  blockExplorers: {
    default: { name: 'Abstract Explorer', url: 'https://explorer.testnet.abs.xyz' },
  },
};

const client = createPublicClient({
  chain: abstract,
  transport: http(),
});

// Known DEX factory addresses on Abstract (you'll need to update these)
const DEX_FACTORIES = {
  UNISWAP_V3: '0x...', // Update with actual address
  PANCAKESWAP: '0x...', // Update with actual address
  // Add more as they deploy on Abstract
};

// Token interfaces
export interface TokenPair {
  id: string;
  token0: {
    address: string;
    symbol: string;
    name: string;
    decimals: number;
  };
  token1: {
    address: string;
    symbol: string;
    name: string;
    decimals: number;
  };
  pairAddress: string;
  liquidity: string;
  volume24h: string;
  priceChange24h: number;
  createdAt: number;
  dex: string;
}

export interface TokenPrice {
  address: string;
  price: number;
  priceChange24h: number;
  volume24h: number;
  marketCap: number;
  liquidity: number;
}

// Real-time token discovery
export class AbstractTokenAPI {
  private cache = new Map<string, any>();
  private lastFetch = 0;
  private cacheDuration = 30000; // 30 seconds

  async getNewTokenPairs(limit = 50): Promise<TokenPair[]> {
    try {
      // Check cache first
      const cacheKey = `pairs_${limit}`;
      if (this.cache.has(cacheKey) && Date.now() - this.lastFetch < this.cacheDuration) {
        return this.cache.get(cacheKey);
      }

      // Fetch from multiple sources
      const [defiLlamaData, contractEvents] = await Promise.allSettled([
        this.fetchFromDeFiLlama(),
        this.fetchFromContractEvents(),
      ]);

      let pairs: TokenPair[] = [];

      // Combine data sources
      if (defiLlamaData.status === 'fulfilled') {
        pairs = [...pairs, ...defiLlamaData.value];
      }

      if (contractEvents.status === 'fulfilled') {
        pairs = [...pairs, ...contractEvents.value];
      }

      // Remove duplicates and sort by creation time
      const uniquePairs = this.removeDuplicates(pairs);
      const sortedPairs = uniquePairs
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, limit);

      // Cache results
      this.cache.set(cacheKey, sortedPairs);
      this.lastFetch = Date.now();

      return sortedPairs;
    } catch (error) {
      console.error('Error fetching token pairs:', error);
      return this.getMockData(); // Fallback to mock data
    }
  }

  private async fetchFromDeFiLlama(): Promise<TokenPair[]> {
    try {
      // Note: DeFiLlama might not have Abstract data yet
      const response = await fetch('https://api.llama.fi/overview/dexs/abstract');
      if (!response.ok) throw new Error('DeFiLlama API error');
      
      const data = await response.json();
      return this.parseDeFiLlamaData(data);
    } catch (error) {
      console.log('DeFiLlama data not available yet for Abstract');
      return [];
    }
  }

  private async fetchFromContractEvents(): Promise<TokenPair[]> {
    try {
      const pairs: TokenPair[] = [];

      // Monitor PairCreated events from DEX factories
      for (const [dexName, factoryAddress] of Object.entries(DEX_FACTORIES)) {
        if (!factoryAddress || factoryAddress === '0x...') continue;

        const events = await client.getLogs({
          address: factoryAddress as `0x${string}`,
          event: parseAbiItem('event PairCreated(address indexed token0, address indexed token1, address pair, uint256)'),
          fromBlock: 'earliest',
        });

        // Process recent events (last 24 hours)
        const recentEvents = events.slice(-100); // Last 100 pairs
        
        for (const event of recentEvents) {
          const pairData = await this.processPairEvent(event, dexName);
          if (pairData) pairs.push(pairData);
        }
      }

      return pairs;
    } catch (error) {
      console.error('Error fetching contract events:', error);
      return [];
    }
  }

  private async processPairEvent(event: any, dexName: string): Promise<TokenPair | null> {
    try {
      const { token0, token1, pair } = event.args;
      
      // Get token information
      const [token0Info, token1Info] = await Promise.all([
        this.getTokenInfo(token0),
        this.getTokenInfo(token1),
      ]);

      // Get pair statistics
      const pairStats = await this.getPairStats(pair);

      return {
        id: `${pair}-${dexName}`,
        token0: token0Info,
        token1: token1Info,
        pairAddress: pair,
        liquidity: pairStats.liquidity,
        volume24h: pairStats.volume24h,
        priceChange24h: pairStats.priceChange24h,
        createdAt: Date.now(), // You'd get this from block timestamp
        dex: dexName,
      };
    } catch (error) {
      console.error('Error processing pair event:', error);
      return null;
    }
  }

  private async getTokenInfo(address: string) {
    // Fetch token metadata from contract
    try {
      const [symbol, name, decimals] = await Promise.all([
        client.readContract({
          address: address as `0x${string}`,
          abi: [parseAbiItem('function symbol() view returns (string)')],
          functionName: 'symbol',
        }),
        client.readContract({
          address: address as `0x${string}`,
          abi: [parseAbiItem('function name() view returns (string)')],
          functionName: 'name',
        }),
        client.readContract({
          address: address as `0x${string}`,
          abi: [parseAbiItem('function decimals() view returns (uint8)')],
          functionName: 'decimals',
        }),
      ]);

      return {
        address,
        symbol: symbol as string,
        name: name as string,
        decimals: decimals as number,
      };
    } catch (error) {
      return {
        address,
        symbol: 'UNKNOWN',
        name: 'Unknown Token',
        decimals: 18,
      };
    }
  }

  private async getPairStats(pairAddress: string) {
    // This would fetch liquidity, volume, etc. from the pair contract
    // For now, return mock data
    return {
      liquidity: (Math.random() * 1000000).toString(),
      volume24h: (Math.random() * 100000).toString(),
      priceChange24h: (Math.random() - 0.5) * 20,
    };
  }

  private parseDeFiLlamaData(data: any): TokenPair[] {
    // Parse DeFiLlama response format
    return [];
  }

  private removeDuplicates(pairs: TokenPair[]): TokenPair[] {
    const seen = new Set();
    return pairs.filter(pair => {
      const key = `${pair.token0.address}-${pair.token1.address}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private getMockData(): TokenPair[] {
    // Return existing mock data as fallback
    return [
      {
        id: 'mock-1',
        token0: {
          address: '0x1234567890123456789012345678901234567890',
          symbol: 'MOCK',
          name: 'Mock Token',
          decimals: 18,
        },
        token1: {
          address: '0x0987654321098765432109876543210987654321',
          symbol: 'TEST',
          name: 'Test Token',
          decimals: 18,
        },
        pairAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
        liquidity: '50000',
        volume24h: '25000',
        priceChange24h: 5.25,
        createdAt: Date.now() - 3600000, // 1 hour ago
        dex: 'Mock DEX',
      },
    ];
  }

  // Get token prices
  async getTokenPrices(addresses: string[]): Promise<Record<string, TokenPrice>> {
    try {
      // In production, integrate with:
      // - Coinbase API
      // - CoinGecko API  
      // - DEX price feeds
      
      const prices: Record<string, TokenPrice> = {};
      
      for (const address of addresses) {
        prices[address] = {
          address,
          price: Math.random() * 100,
          priceChange24h: (Math.random() - 0.5) * 20,
          volume24h: Math.random() * 1000000,
          marketCap: Math.random() * 10000000,
          liquidity: Math.random() * 500000,
        };
      }

      return prices;
    } catch (error) {
      console.error('Error fetching token prices:', error);
      return {};
    }
  }

  // Monitor for new tokens via Telegram
  async setupTelegramMonitoring(botToken: string, channelId: string) {
    // This would set up webhook monitoring
    // Parse messages for new token deployments
    // Extract contract addresses and add to monitoring
  }
}

// Export singleton instance
export const abstractAPI = new AbstractTokenAPI();