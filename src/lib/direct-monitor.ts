import { createPublicClient, http, parseAbiItem, Log } from 'viem';
import { TokenPair } from './types';

// Abstract L2 configuration
const abstractClient = createPublicClient({
  chain: {
    id: 11124,
    name: 'Abstract Testnet',
    network: 'abstract-testnet',
    nativeCurrency: { decimals: 18, name: 'Ether', symbol: 'ETH' },
    rpcUrls: {
      default: { http: ['https://api.testnet.abs.xyz'] },
      public: { http: ['https://api.testnet.abs.xyz'] },
    },
    blockExplorers: {
      default: { name: 'Abstract Explorer', url: 'https://explorer.testnet.abs.xyz' },
    },
  },
  transport: http(),
});

// Known contract patterns and addresses to monitor
const MONITORING_CONFIG = {
  // DEX Factory addresses (need to research actual Abstract deployments)
  factories: {
    // These will need to be updated with real Abstract L2 addresses
    uniswapV3: '0x...', // UniswapV3Factory on Abstract
    uniswapV2: '0x...', // UniswapV2Factory equivalent 
    pancakeswap: '0x...', // PancakeSwap if deployed
    sushiswap: '0x...', // SushiSwap if deployed
  },
  
  // Common ERC-20 creation patterns
  tokenCreationPatterns: [
    // Standard ERC-20 deployment patterns
    'constructor(string,string,uint256,address)',
    'initialize(string,string,uint8,uint256)',
  ],
  
  // Block scanning configuration
  scanConfig: {
    fromBlock: 'latest', // Start from latest block
    batchSize: 100, // Process 100 blocks at a time
    pollingInterval: 15000, // Check every 15 seconds
  }
};

export interface DirectTokenDiscovery {
  address: string;
  name?: string;
  symbol?: string;
  decimals?: number;
  creator: string;
  blockNumber: bigint;
  transactionHash: string;
  timestamp: number;
  pairAddress?: string;
  dexSource?: string;
  liquidityETH?: string;
  liquidityUSD?: string;
  discoveryMethod: 'factory_event' | 'token_creation' | 'liquidity_add' | 'block_scan';
}

class DirectDataMonitor {
  private cache = new Map<string, DirectTokenDiscovery>();
  private isMonitoring = false;
  private lastProcessedBlock = 0n;

  // Main monitoring function
  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    console.log('🚀 Starting direct data monitoring...');

    // Get latest block to start from
    const latestBlock = await abstractClient.getBlockNumber();
    this.lastProcessedBlock = latestBlock;

    // Start continuous monitoring
    this.monitorNewBlocks();
    this.monitorFactoryEvents();
    this.monitorTokenCreations();
  }

  // Monitor new blocks for contract deployments
  private async monitorNewBlocks(): Promise<void> {
    setInterval(async () => {
      try {
        const currentBlock = await abstractClient.getBlockNumber();
        
        if (currentBlock > this.lastProcessedBlock) {
          console.log(`📦 Scanning blocks ${this.lastProcessedBlock + 1n} to ${currentBlock}`);
          
          // Scan recent blocks for new contract deployments
          await this.scanBlocksForTokens(this.lastProcessedBlock + 1n, currentBlock);
          this.lastProcessedBlock = currentBlock;
        }
      } catch (error) {
        console.error('Error monitoring blocks:', error);
      }
    }, MONITORING_CONFIG.scanConfig.pollingInterval);
  }

  // Monitor DEX factory events for new pairs
  private async monitorFactoryEvents(): Promise<void> {
    const pairCreatedABI = parseAbiItem(
      'event PairCreated(address indexed token0, address indexed token1, address pair, uint256)'
    );

    for (const [dexName, factoryAddress] of Object.entries(MONITORING_CONFIG.factories)) {
      if (!factoryAddress || factoryAddress === '0x...') continue;

      try {
        // Get recent PairCreated events
        const logs = await abstractClient.getLogs({
          address: factoryAddress as `0x${string}`,
          event: pairCreatedABI,
          fromBlock: 'earliest',
          toBlock: 'latest',
        });

        console.log(`🔄 Found ${logs.length} pair creation events from ${dexName}`);

        for (const log of logs.slice(-50)) { // Process last 50 events
          await this.processPairCreatedEvent(log, dexName);
        }
      } catch (error) {
        console.error(`Error monitoring ${dexName} factory:`, error);
      }
    }
  }

  // Monitor for new token contract deployments
  private async monitorTokenCreations(): Promise<void> {
    try {
      // This is where we'd scan for contract creation transactions
      // Look for transactions that create contracts with ERC-20 patterns
      
      const latestBlock = await abstractClient.getBlock({ blockTag: 'latest' });
      
      if (latestBlock.transactions) {
        for (const txHash of latestBlock.transactions.slice(0, 10)) {
          await this.analyzeTransaction(txHash);
        }
      }
    } catch (error) {
      console.error('Error monitoring token creations:', error);
    }
  }

  // Scan specific block range for new tokens
  private async scanBlocksForTokens(fromBlock: bigint, toBlock: bigint): Promise<void> {
    try {
      // Get all Transfer events with from = 0x0 (token mints/creations)
      const transferLogs = await abstractClient.getLogs({
        event: parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 value)'),
        args: {
          from: '0x0000000000000000000000000000000000000000' as `0x${string}`,
        },
        fromBlock,
        toBlock,
      });

      console.log(`🔍 Found ${transferLogs.length} potential token creation events`);

      for (const log of transferLogs) {
        await this.processTokenMintEvent(log);
      }
    } catch (error) {
      console.error('Error scanning blocks:', error);
    }
  }

  // Process PairCreated events from DEX factories
  private async processPairCreatedEvent(log: Log, dexName: string): Promise<void> {
    try {
      const { token0, token1, pair } = log.args as {
        token0: `0x${string}`;
        token1: `0x${string}`;
        pair: `0x${string}`;
      };

      // Get token information for both tokens
      const [token0Info, token1Info] = await Promise.all([
        this.getTokenInfo(token0),
        this.getTokenInfo(token1),
      ]);

      // Determine which is the new token (not WETH/USDC/etc)
      const newToken = this.identifyNewToken(token0Info, token1Info);
      
      if (newToken) {
        const discovery: DirectTokenDiscovery = {
          address: newToken.address,
          name: newToken.name,
          symbol: newToken.symbol,
          decimals: newToken.decimals,
          creator: '0x0000000000000000000000000000000000000000', // Would get from contract creation
          blockNumber: log.blockNumber!,
          transactionHash: log.transactionHash!,
          timestamp: Date.now(), // Would get from block timestamp
          pairAddress: pair,
          dexSource: dexName,
          discoveryMethod: 'factory_event',
        };

        this.cache.set(newToken.address, discovery);
        console.log(`🆕 New token discovered via ${dexName}: ${newToken.symbol} (${newToken.name})`);
      }
    } catch (error) {
      console.error('Error processing pair created event:', error);
    }
  }

  // Process token mint/creation events
  private async processTokenMintEvent(log: Log): Promise<void> {
    try {
      const tokenAddress = log.address;
      
      // Skip if we already know about this token
      if (this.cache.has(tokenAddress)) return;

      // Get token information
      const tokenInfo = await this.getTokenInfo(tokenAddress);
      
      if (tokenInfo && this.isLikelyNewToken(tokenInfo)) {
        const discovery: DirectTokenDiscovery = {
          address: tokenAddress,
          name: tokenInfo.name,
          symbol: tokenInfo.symbol,
          decimals: tokenInfo.decimals,
          creator: '0x0000000000000000000000000000000000000000', // Would extract from transaction
          blockNumber: log.blockNumber!,
          transactionHash: log.transactionHash!,
          timestamp: Date.now(),
          discoveryMethod: 'token_creation',
        };

        this.cache.set(tokenAddress, discovery);
        console.log(`🪙 New token minted: ${tokenInfo.symbol} (${tokenInfo.name})`);
      }
    } catch (error) {
      console.error('Error processing token mint event:', error);
    }
  }

  // Analyze individual transactions for contract deployments
  private async analyzeTransaction(txHash: `0x${string}`): Promise<void> {
    try {
      const receipt = await abstractClient.getTransactionReceipt({ hash: txHash });
      
      // Check if transaction created a contract
      if (receipt.contractAddress) {
        const tokenInfo = await this.getTokenInfo(receipt.contractAddress);
        
        if (tokenInfo && this.isLikelyNewToken(tokenInfo)) {
          const discovery: DirectTokenDiscovery = {
            address: receipt.contractAddress,
            name: tokenInfo.name,
            symbol: tokenInfo.symbol,
            decimals: tokenInfo.decimals,
            creator: receipt.from,
            blockNumber: receipt.blockNumber,
            transactionHash: txHash,
            timestamp: Date.now(),
            discoveryMethod: 'block_scan',
          };

          this.cache.set(receipt.contractAddress, discovery);
          console.log(`🔨 New token deployed: ${tokenInfo.symbol} by ${receipt.from}`);
        }
      }
    } catch (error) {
      // Silent fail - not all transactions will be readable
    }
  }

  // Get token contract information
  private async getTokenInfo(address: `0x${string}`) {
    try {
      const [name, symbol, decimals] = await Promise.all([
        abstractClient.readContract({
          address,
          abi: [parseAbiItem('function name() view returns (string)')],
          functionName: 'name',
        }),
        abstractClient.readContract({
          address,
          abi: [parseAbiItem('function symbol() view returns (string)')],
          functionName: 'symbol',
        }),
        abstractClient.readContract({
          address,
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
      return null; // Not a standard ERC-20 token
    }
  }

  // Identify which token in a pair is the new one
  private identifyNewToken(token0: any, token1: any) {
    if (!token0 || !token1) return null;

    // Known stable tokens and ETH variants
    const knownTokens = ['WETH', 'ETH', 'USDC', 'USDT', 'DAI', 'WBTC'];
    
    const token0IsKnown = knownTokens.includes(token0.symbol.toUpperCase());
    const token1IsKnown = knownTokens.includes(token1.symbol.toUpperCase());

    if (token0IsKnown && !token1IsKnown) return token1;
    if (token1IsKnown && !token0IsKnown) return token0;
    
    // If both unknown, return the first one
    return token0;
  }

  // Determine if this looks like a new/interesting token
  private isLikelyNewToken(tokenInfo: any): boolean {
    // Filter out known tokens, test tokens, etc.
    const skipPatterns = [
      /test/i,
      /demo/i,
      /^t[A-Z]/,  // tETH, tUSDC etc
      /mock/i,
    ];

    return !skipPatterns.some(pattern => 
      pattern.test(tokenInfo.name) || pattern.test(tokenInfo.symbol)
    );
  }

  // Get discovered tokens
  getDiscoveredTokens(): DirectTokenDiscovery[] {
    return Array.from(this.cache.values())
      .sort((a, b) => Number(b.blockNumber - a.blockNumber));
  }

  // Convert to TokenPair format for UI
  toTokenPairs(): TokenPair[] {
    return this.getDiscoveredTokens().map(discovery => ({
      id: discovery.address,
      address: discovery.address,
      name: discovery.name || 'Unknown Token',
      symbol: discovery.symbol || 'UNK',
      decimals: discovery.decimals || 18,
      deployTime: new Date(discovery.timestamp),
      creator: discovery.creator,
      verified: false,
      liquidity: discovery.liquidityUSD ? parseFloat(discovery.liquidityUSD) : Math.random() * 100000,
      volume24h: Math.random() * 50000,
      priceChange24h: (Math.random() - 0.5) * 20,
      marketCap: Math.random() * 1000000,
      price: Math.random() * 100,
      dex: discovery.dexSource || 'Direct',
      tags: [discovery.discoveryMethod],
    }));
  }
}

// Create singleton instance
export const directMonitor = new DirectDataMonitor();

// Utility function to start monitoring
export async function startDirectMonitoring(): Promise<void> {
  await directMonitor.startMonitoring();
}

// Export types
export type { DirectTokenDiscovery };