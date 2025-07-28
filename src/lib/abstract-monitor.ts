import { createPublicClient, http, parseAbiItem, getContract } from 'viem';

// Abstract L2 Chain Configuration
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

// Known Factory Addresses (UPDATE THESE WITH REAL ADDRESSES)
const FACTORY_ADDRESSES = {
  // TODO: Replace with actual deployed addresses from research
  pancakeswap: '0x...', // PancakeSwap Factory
  native_dex: '0x...', // Abstract native DEX
  uniswap_v2: '0x...', // If deployed
};

export interface TokenDiscovery {
  address: string;
  name: string;
  symbol: string;
  creator: string;
  pairAddress?: string;
  dexSource: string;
  blockNumber: number;
  timestamp: number;
  price?: number;
  volume24h?: number;
  liquidity?: number;
}

class AbstractMonitor {
  private discoveries = new Map<string, TokenDiscovery>();
  private isMonitoring = false;
  private lastProcessedBlock = 0n;

  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    console.log('🚀 Starting Abstract L2 monitoring...');

    try {
      // Get current block
      this.lastProcessedBlock = await client.getBlockNumber();
      console.log(`📦 Starting from block: ${this.lastProcessedBlock}`);

      // Start monitoring loops
      this.monitorNewBlocks();
      this.monitorFactoryEvents();
      
    } catch (error) {
      console.error('❌ Error starting monitoring:', error);
    }
  }

  private async monitorNewBlocks(): void {
    setInterval(async () => {
      try {
        const currentBlock = await client.getBlockNumber();
        
        if (currentBlock > this.lastProcessedBlock) {
          console.log(`🔍 Scanning blocks ${this.lastProcessedBlock + 1n} to ${currentBlock}`);
          
          // Scan for new contract deployments
          await this.scanBlocksForTokens(this.lastProcessedBlock + 1n, currentBlock);
          this.lastProcessedBlock = currentBlock;
        }
      } catch (error) {
        console.error('Error monitoring blocks:', error);
      }
    }, 15000); // Check every 15 seconds
  }

  private async monitorFactoryEvents(): void {
    const pairCreatedABI = parseAbiItem(
      'event PairCreated(address indexed token0, address indexed token1, address pair, uint256)'
    );

    for (const [dexName, factoryAddress] of Object.entries(FACTORY_ADDRESSES)) {
      if (!factoryAddress || factoryAddress === '0x...') continue;

      try {
        console.log(`🔄 Monitoring ${dexName} factory: ${factoryAddress}`);
        
        // Get recent PairCreated events
        const logs = await client.getLogs({
          address: factoryAddress as `0x${string}`,
          event: pairCreatedABI,
          fromBlock: this.lastProcessedBlock - 1000n, // Last 1000 blocks
          toBlock: 'latest',
        });

        for (const log of logs) {
          await this.processPairCreatedEvent(log, dexName);
        }
      } catch (error) {
        console.error(`Error monitoring ${dexName}:`, error);
      }
    }
  }

  private async scanBlocksForTokens(fromBlock: bigint, toBlock: bigint): void {
    try {
      // Look for Transfer events from 0x0 (token mints)
      const transferLogs = await client.getLogs({
        event: parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 value)'),
        args: {
          from: '0x0000000000000000000000000000000000000000' as `0x${string}`,
        },
        fromBlock,
        toBlock,
      });

      console.log(`🪙 Found ${transferLogs.length} potential token creation events`);

      for (const log of transferLogs) {
        await this.processTokenMintEvent(log);
      }
    } catch (error) {
      console.error('Error scanning blocks:', error);
    }
  }

  private async processPairCreatedEvent(log: any, dexName: string): void {
    try {
      const { token0, token1, pair } = log.args;
      
      // Get token info for both tokens
      const [token0Info, token1Info] = await Promise.all([
        this.getTokenInfo(token0),
        this.getTokenInfo(token1),
      ]);

      // Identify the new token (not WETH/USDC/etc)
      const newToken = this.identifyNewToken(token0Info, token1Info);
      
      if (newToken) {
        const discovery: TokenDiscovery = {
          address: newToken.address,
          name: newToken.name,
          symbol: newToken.symbol,
          creator: '0x0000000000000000000000000000000000000000', // Get from tx
          pairAddress: pair,
          dexSource: dexName,
          blockNumber: Number(log.blockNumber!),
          timestamp: Date.now(),
          price: Math.random() * 0.01, // Replace with real price calculation
          volume24h: Math.random() * 10000,
          liquidity: Math.random() * 50000,
        };

        this.discoveries.set(newToken.address, discovery);
        console.log(`🆕 New token discovered: ${newToken.symbol} on ${dexName}`);
      }
    } catch (error) {
      console.error('Error processing pair created event:', error);
    }
  }

  private async processTokenMintEvent(log: any): void {
    try {
      const tokenAddress = log.address;
      
      if (this.discoveries.has(tokenAddress)) return;

      const tokenInfo = await this.getTokenInfo(tokenAddress);
      
      if (tokenInfo && this.isNewToken(tokenInfo)) {
        const discovery: TokenDiscovery = {
          address: tokenAddress,
          name: tokenInfo.name,
          symbol: tokenInfo.symbol,
          creator: '0x0000000000000000000000000000000000000000',
          dexSource: 'BlockScan',
          blockNumber: Number(log.blockNumber!),
          timestamp: Date.now(),
          price: Math.random() * 0.01,
          volume24h: Math.random() * 5000,
          liquidity: Math.random() * 25000,
        };

        this.discoveries.set(tokenAddress, discovery);
        console.log(`🔨 New token minted: ${tokenInfo.symbol}`);
      }
    } catch (error) {
      // Silent fail for non-ERC20 contracts
    }
  }

  private async getTokenInfo(address: string) {
    try {
      const [name, symbol, decimals] = await Promise.all([
        client.readContract({
          address: address as `0x${string}`,
          abi: [parseAbiItem('function name() view returns (string)')],
          functionName: 'name',
        }),
        client.readContract({
          address: address as `0x${string}`,
          abi: [parseAbiItem('function symbol() view returns (string)')],
          functionName: 'symbol',
        }),
        client.readContract({
          address: address as `0x${string}`,
          abi: [parseAbiItem('function decimals() view returns (uint8)')],
          functionName: 'decimals',
        }),
      ]);

      return {
        address,
        name: name as string,
        symbol: symbol as string,
        decimals: decimals as number,
      };
    } catch (error) {
      return null;
    }
  }

  private identifyNewToken(token0: any, token1: any) {
    if (!token0 || !token1) return null;

    const knownTokens = ['WETH', 'ETH', 'USDC', 'USDT', 'DAI', 'WBTC'];
    
    const token0IsKnown = knownTokens.includes(token0.symbol.toUpperCase());
    const token1IsKnown = knownTokens.includes(token1.symbol.toUpperCase());

    if (token0IsKnown && !token1IsKnown) return token1;
    if (token1IsKnown && !token0IsKnown) return token0;
    
    return token0; // If both unknown, return first
  }

  private isNewToken(tokenInfo: any): boolean {
    const skipPatterns = [
      /test/i, /demo/i, /mock/i, /^t[A-Z]/
    ];

    return !skipPatterns.some(pattern => 
      pattern.test(tokenInfo.name) || pattern.test(tokenInfo.symbol)
    );
  }

  // Convert to UI format
  getDiscoveredTokens(): any[] {
    return Array.from(this.discoveries.values())
      .sort((a, b) => b.blockNumber - a.blockNumber)
      .map(discovery => ({
        id: discovery.address,
        address: discovery.address,
        name: discovery.name,
        symbol: discovery.symbol,
        price: discovery.price || 0,
        priceChange24h: (Math.random() - 0.5) * 20,
        volume24h: discovery.volume24h || 0,
        marketCap: (discovery.price || 0) * 1000000,
        liquidity: discovery.liquidity || 0,
        createdAt: discovery.timestamp,
        dex: discovery.dexSource,
      }));
  }
}

// Singleton instance
export const abstractMonitor = new AbstractMonitor();

// Start monitoring function
export async function startAbstractMonitoring(): Promise<void> {
  await abstractMonitor.startMonitoring();
}