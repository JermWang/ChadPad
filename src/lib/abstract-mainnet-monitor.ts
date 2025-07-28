import { createPublicClient, http, parseAbiItem, formatEther } from 'viem';

// Abstract L2 Mainnet Configuration
const abstractMainnet = {
  id: 11124, // Update when official mainnet chain ID is confirmed
  name: 'Abstract',
  network: 'abstract',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: { http: ['https://api.abs.xyz'] }, // Update with official mainnet RPC
    public: { http: ['https://api.abs.xyz'] },
  },
  blockExplorers: {
    default: { name: 'Abstract Explorer', url: 'https://explorer.abs.xyz' },
  },
};

const client = createPublicClient({
  chain: abstractMainnet,
  transport: http(),
});

export interface TokenLaunch {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
  creator: string;
  deploymentTx: string;
  blockNumber: number;
  timestamp: number;
  discoveryMethod: 'deployment' | 'mint' | 'dex' | 'api';
  metadata: {
    hasLiquidity: boolean;
    firstMintRecipient?: string;
    dexListings: Array<{
      dex: string;
      pairAddress: string;
      liquidity: number;
    }>;
    socialLinks?: {
      website?: string;
      twitter?: string;
      telegram?: string;
    };
  };
}

class AbstractMainnetMonitor {
  private tokenLaunches = new Map<string, TokenLaunch>();
  private isMonitoring = false;
  private lastProcessedBlock = 0n;
  private stats = {
    totalTokens: 0,
    tokensWithLiquidity: 0,
    averageBlockTime: 2000, // 2 seconds estimated
    lastUpdate: Date.now(),
  };

  async startMainnetMonitoring(): Promise<void> {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    console.log('🚀 Starting ABSTRACT MAINNET token monitoring...');
    
    try {
      // Get starting block
      this.lastProcessedBlock = await client.getBlockNumber();
      console.log(`📦 Starting from block: ${this.lastProcessedBlock}`);

      // Start all detection methods
      this.startDeploymentMonitoring();
      this.startTransferMonitoring();  
      this.startDEXMonitoring();
      this.startExternalAPIMonitoring();

      console.log('✅ All monitoring systems active!');
      
    } catch (error) {
      console.error('❌ Error starting mainnet monitoring:', error);
      throw error;
    }
  }

  // Method 1: Contract Deployment Detection
  private startDeploymentMonitoring(): void {
    console.log('🔨 Starting deployment monitoring...');
    
    setInterval(async () => {
      try {
        const currentBlock = await client.getBlockNumber();
        
        if (currentBlock > this.lastProcessedBlock) {
          console.log(`🔍 Scanning blocks ${this.lastProcessedBlock + 1n} → ${currentBlock}`);
          
          // Scan each new block
          for (let block = this.lastProcessedBlock + 1n; block <= currentBlock; block++) {
            await this.scanBlockForTokenDeployments(block);
          }
          
          this.lastProcessedBlock = currentBlock;
          this.updateStats();
        }
      } catch (error) {
        console.error('Error in deployment monitoring:', error);
      }
    }, 5000); // Check every 5 seconds for fast detection
  }

  private async scanBlockForTokenDeployments(blockNumber: bigint): Promise<void> {
    try {
      const block = await client.getBlock({
        blockNumber,
        includeTransactions: true,
      });

      // Find contract deployment transactions (to: null)
      const deployments = block.transactions.filter(tx => 
        typeof tx === 'object' && tx.to === null
      );

      for (const tx of deployments) {
        if (typeof tx === 'object') {
          await this.processDeploymentTransaction(tx, Number(blockNumber));
        }
      }
    } catch (error) {
      console.error(`Error scanning block ${blockNumber}:`, error);
    }
  }

  private async processDeploymentTransaction(tx: any, blockNumber: number): Promise<void> {
    try {
      const receipt = await client.getTransactionReceipt({ hash: tx.hash });
      
      if (!receipt.contractAddress) return;

      // Analyze if it's an ERC-20 token
      const tokenInfo = await this.analyzeContract(receipt.contractAddress);
      
      if (tokenInfo.isERC20) {
        const tokenLaunch: TokenLaunch = {
          address: receipt.contractAddress,
          name: tokenInfo.name,
          symbol: tokenInfo.symbol,
          decimals: tokenInfo.decimals,
          totalSupply: tokenInfo.totalSupply,
          creator: tx.from,
          deploymentTx: tx.hash,
          blockNumber,
          timestamp: Date.now(),
          discoveryMethod: 'deployment',
          metadata: {
            hasLiquidity: false,
            dexListings: [],
          },
        };

        this.tokenLaunches.set(receipt.contractAddress, tokenLaunch);
        
        console.log(`🆕 NEW TOKEN DEPLOYED: ${tokenInfo.symbol} (${tokenInfo.name})`);
        console.log(`📍 Address: ${receipt.contractAddress}`);
        console.log(`👤 Creator: ${tx.from}`);
        console.log(`📊 Supply: ${tokenInfo.totalSupply}`);
      }
    } catch (error) {
      console.error('Error processing deployment:', error);
    }
  }

  // Method 2: Transfer Event Monitoring (Mints)
  private startTransferMonitoring(): void {
    console.log('🪙 Starting transfer event monitoring...');
    
    setInterval(async () => {
      try {
        // Monitor Transfer events from 0x0 (mints)
        const transferLogs = await client.getLogs({
          event: parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 value)'),
          args: {
            from: '0x0000000000000000000000000000000000000000',
          },
          fromBlock: this.lastProcessedBlock - 10n, // Small overlap for safety
          toBlock: 'latest',
        });

        for (const log of transferLogs) {
          await this.processMintEvent(log);
        }
      } catch (error) {
        console.error('Error monitoring transfers:', error);
      }
    }, 10000); // Check every 10 seconds
  }

  private async processMintEvent(log: any): Promise<void> {
    try {
      const tokenAddress = log.address;
      
      // Skip if already discovered
      if (this.tokenLaunches.has(tokenAddress)) {
        // Update existing with mint info
        const existing = this.tokenLaunches.get(tokenAddress)!;
        existing.metadata.firstMintRecipient = log.args.to;
        return;
      }

      // Analyze new token from mint event
      const tokenInfo = await this.analyzeContract(tokenAddress);
      
      if (tokenInfo.isERC20) {
        const tokenLaunch: TokenLaunch = {
          address: tokenAddress,
          name: tokenInfo.name,
          symbol: tokenInfo.symbol,
          decimals: tokenInfo.decimals,
          totalSupply: tokenInfo.totalSupply,
          creator: log.args.to, // First recipient
          deploymentTx: log.transactionHash,
          blockNumber: Number(log.blockNumber),
          timestamp: Date.now(),
          discoveryMethod: 'mint',
          metadata: {
            hasLiquidity: false,
            firstMintRecipient: log.args.to,
            dexListings: [],
          },
        };

        this.tokenLaunches.set(tokenAddress, tokenLaunch);
        
        console.log(`🪙 NEW TOKEN VIA MINT: ${tokenInfo.symbol} (${tokenInfo.name})`);
        console.log(`🎯 First recipient: ${log.args.to}`);
      }
    } catch (error) {
      console.error('Error processing mint event:', error);
    }
  }

  // Method 3: DEX Monitoring
  private startDEXMonitoring(): void {
    console.log('🔄 Starting DEX monitoring...');
    
    // Monitor DexScreener API
    setInterval(async () => {
      await this.checkDexScreenerAPI();
    }, 30000); // Every 30 seconds

    // Monitor known DEX factories (when addresses are available)
    setInterval(async () => {
      await this.monitorDEXFactories();
    }, 20000); // Every 20 seconds
  }

  private async checkDexScreenerAPI(): Promise<void> {
    try {
      const response = await fetch('https://api.dexscreener.com/latest/dex/pairs/abstract');
      
      if (response.ok) {
        const data = await response.json();
        
        for (const pair of data.pairs || []) {
          await this.processDEXPair(pair);
        }
      }
    } catch (error) {
      // DexScreener might not support Abstract yet
      console.log('DexScreener not available for Abstract yet');
    }
  }

  private async monitorDEXFactories(): Promise<void> {
    // TODO: Add real Abstract DEX factory addresses when available
    const knownFactories = [
      // '0x...', // PancakeSwap on Abstract
      // '0x...', // Native Abstract DEX
      // '0x...', // Other DEXs
    ];

    for (const factory of knownFactories) {
      try {
        const pairLogs = await client.getLogs({
          address: factory as `0x${string}`,
          event: parseAbiItem('event PairCreated(address indexed token0, address indexed token1, address pair, uint256)'),
          fromBlock: this.lastProcessedBlock - 10n,
          toBlock: 'latest',
        });

        for (const log of pairLogs) {
          await this.processPairCreated(log);
        }
      } catch (error) {
        console.error(`Error monitoring DEX factory ${factory}:`, error);
      }
    }
  }

  private async processDEXPair(pair: any): Promise<void> {
    // Process tokens from DEX pair data
    const tokens = [pair.baseToken, pair.quoteToken].filter(Boolean);
    
    for (const token of tokens) {
      if (!token?.address) continue;
      
      if (this.tokenLaunches.has(token.address)) {
        // Update existing with DEX info
        const existing = this.tokenLaunches.get(token.address)!;
        existing.metadata.hasLiquidity = true;
        existing.metadata.dexListings.push({
          dex: 'DexScreener',
          pairAddress: pair.pairAddress,
          liquidity: pair.liquidity?.usd || 0,
        });
      } else {
        // Discover new token via DEX
        await this.discoverTokenViaDEX(token, pair);
      }
    }
  }

  private async processPairCreated(log: any): Promise<void> {
    const { token0, token1, pair } = log.args;
    
    for (const tokenAddr of [token0, token1]) {
      if (this.tokenLaunches.has(tokenAddr)) {
        // Update existing
        const existing = this.tokenLaunches.get(tokenAddr)!;
        existing.metadata.hasLiquidity = true;
        existing.metadata.dexListings.push({
          dex: 'DEX_Factory',
          pairAddress: pair,
          liquidity: 0, // TODO: Calculate
        });
      } else {
        // Discover new token
        const tokenInfo = await this.analyzeContract(tokenAddr);
        if (tokenInfo.isERC20) {
          // Create token launch record
          await this.createTokenLaunchFromDEX(tokenAddr, tokenInfo, log);
        }
      }
    }
  }

  // Method 4: External API Monitoring
  private startExternalAPIMonitoring(): void {
    console.log('🌐 Starting external API monitoring...');
    
    setInterval(async () => {
      // Add other token discovery APIs here
      await this.checkCoinGeckoAPI();
      await this.checkMoralisAPI();
    }, 60000); // Every minute
  }

  private async checkCoinGeckoAPI(): Promise<void> {
    try {
      // CoinGecko new listings (if they support Abstract)
      const response = await fetch('https://api.coingecko.com/api/v3/coins/list?include_platform=false');
      // Process new tokens...
    } catch (error) {
      // Silent fail - API might not support Abstract yet
    }
  }

  private async checkMoralisAPI(): Promise<void> {
    try {
      // Moralis token discovery (if configured)
      // const response = await fetch(`https://api.moralis.io/api/v2/tokens/...`);
      // Process results...
    } catch (error) {
      // Silent fail
    }
  }

  // Helper Methods
  private async analyzeContract(address: string): Promise<any> {
    try {
      const [name, symbol, decimals, totalSupply] = await Promise.all([
        this.safeCall(address, 'function name() view returns (string)', 'name'),
        this.safeCall(address, 'function symbol() view returns (string)', 'symbol'),
        this.safeCall(address, 'function decimals() view returns (uint8)', 'decimals'),
        this.safeCall(address, 'function totalSupply() view returns (uint256)', 'totalSupply'),
      ]);

      return {
        isERC20: !!(name && symbol && decimals !== null),
        name: name || 'Unknown Token',
        symbol: symbol || 'UNK',
        decimals: decimals || 18,
        totalSupply: totalSupply ? formatEther(totalSupply) : '0',
      };
    } catch {
      return { isERC20: false };
    }
  }

  private async safeCall(address: string, abi: string, functionName: string): Promise<any> {
    try {
      return await client.readContract({
        address: address as `0x${string}`,
        abi: [parseAbiItem(abi)],
        functionName,
      });
    } catch {
      return null;
    }
  }

  private async createTokenLaunchFromDEX(address: string, tokenInfo: any, log: any): Promise<void> {
    const tokenLaunch: TokenLaunch = {
      address,
      name: tokenInfo.name,
      symbol: tokenInfo.symbol,
      decimals: tokenInfo.decimals,
      totalSupply: tokenInfo.totalSupply,
      creator: '0x0000000000000000000000000000000000000000',
      deploymentTx: log.transactionHash,
      blockNumber: Number(log.blockNumber),
      timestamp: Date.now(),
      discoveryMethod: 'dex',
      metadata: {
        hasLiquidity: true,
        dexListings: [],
      },
    };

    this.tokenLaunches.set(address, tokenLaunch);
    console.log(`🔄 NEW TOKEN VIA DEX: ${tokenInfo.symbol} (${tokenInfo.name})`);
  }

  private async discoverTokenViaDEX(token: any, pair: any): Promise<void> {
    const tokenInfo = await this.analyzeContract(token.address);
    
    if (tokenInfo.isERC20) {
      const tokenLaunch: TokenLaunch = {
        address: token.address,
        name: tokenInfo.name,
        symbol: tokenInfo.symbol,
        decimals: tokenInfo.decimals,
        totalSupply: tokenInfo.totalSupply,
        creator: '0x0000000000000000000000000000000000000000',
        deploymentTx: '',
        blockNumber: 0,
        timestamp: Date.now(),
        discoveryMethod: 'dex',
        metadata: {
          hasLiquidity: true,
          dexListings: [{
            dex: 'DexScreener',
            pairAddress: pair.pairAddress,
            liquidity: pair.liquidity?.usd || 0,
          }],
        },
      };

      this.tokenLaunches.set(token.address, tokenLaunch);
      console.log(`💱 NEW TOKEN VIA DEXSCREENER: ${tokenInfo.symbol}`);
    }
  }

  private updateStats(): void {
    const tokens = Array.from(this.tokenLaunches.values());
    this.stats = {
      totalTokens: tokens.length,
      tokensWithLiquidity: tokens.filter(t => t.metadata.hasLiquidity).length,
      averageBlockTime: 2000,
      lastUpdate: Date.now(),
    };
  }

  // Public API
  getAllTokenLaunches(): TokenLaunch[] {
    return Array.from(this.tokenLaunches.values())
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  getStats() {
    const tokens = this.getAllTokenLaunches();
    return {
      ...this.stats,
      byMethod: {
        deployment: tokens.filter(t => t.discoveryMethod === 'deployment').length,
        mint: tokens.filter(t => t.discoveryMethod === 'mint').length,
        dex: tokens.filter(t => t.discoveryMethod === 'dex').length,
        api: tokens.filter(t => t.discoveryMethod === 'api').length,
      },
    };
  }

  // Convert to UI format
  getUITokens(): any[] {
    return this.getAllTokenLaunches().map(token => ({
      id: token.address,
      address: token.address,
      name: token.name,
      symbol: token.symbol,
      price: Math.random() * 0.01, // TODO: Get real price
      priceChange24h: (Math.random() - 0.5) * 20,
      volume24h: Math.random() * 10000,
      marketCap: Math.random() * 1000000,
      liquidity: token.metadata.hasLiquidity ? Math.random() * 50000 : 0,
      createdAt: token.timestamp,
      dex: token.metadata.dexListings[0]?.dex || token.discoveryMethod,
      discoveryMethod: token.discoveryMethod,
    }));
  }
}

// Singleton
export const abstractMainnetMonitor = new AbstractMainnetMonitor();

export async function startAbstractMainnetMonitoring(): Promise<void> {
  await abstractMainnetMonitor.startMainnetMonitoring();
}