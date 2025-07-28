import { createPublicClient, http, parseAbiItem, formatEther } from 'viem';

// Abstract L2 Mainnet Configuration
const abstract = {
  id: 11124, // Update with actual mainnet chain ID when available
  name: 'Abstract',
  network: 'abstract',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: { http: ['https://api.abs.xyz'] }, // Update with mainnet RPC
    public: { http: ['https://api.abs.xyz'] },
  },
  blockExplorers: {
    default: { name: 'Abstract Explorer', url: 'https://explorer.abs.xyz' },
  },
};

const client = createPublicClient({
  chain: abstract,
  transport: http(),
});

export interface ComprehensiveTokenDiscovery {
  address: string;
  name?: string;
  symbol?: string;
  decimals?: number;
  totalSupply?: string;
  creator: string;
  deploymentTx: string;
  blockNumber: number;
  timestamp: number;
  discoveryMethod: 'contract_deployment' | 'transfer_event' | 'dex_listing' | 'api_discovery';
  dexListings: Array<{
    dex: string;
    pairAddress: string;
    baseToken: string;
    quoteToken: string;
  }>;
  metadata: {
    isERC20: boolean;
    hasLiquidity: boolean;
    initialSupply?: string;
    firstMintRecipient?: string;
    contractSize: number;
  };
}

class ComprehensiveTokenMonitor {
  private discoveries = new Map<string, ComprehensiveTokenDiscovery>();
  private isMonitoring = false;
  private lastProcessedBlock = 0n;
  private monitoringStrategies: string[] = [];

  constructor() {
    this.monitoringStrategies = [
      'contract_deployment',
      'transfer_events', 
      'dex_integration',
      // 'external_apis' // Add when ready
    ];
  }

  async startComprehensiveMonitoring(): Promise<void> {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    console.log('🚀 Starting COMPREHENSIVE Abstract token monitoring...');
    console.log(`📊 Active strategies: ${this.monitoringStrategies.join(', ')}`);

    try {
      this.lastProcessedBlock = await client.getBlockNumber();
      console.log(`📦 Starting from block: ${this.lastProcessedBlock}`);

      // Start all monitoring strategies
      this.monitorContractDeployments();
      this.monitorTransferEvents();
      this.monitorDEXListings();
      // this.monitorExternalAPIs(); // Uncomment when ready

    } catch (error) {
      console.error('❌ Error starting comprehensive monitoring:', error);
    }
  }

  // Strategy 1: Direct Contract Deployment Monitoring
  private async monitorContractDeployments(): void {
    console.log('🔨 Starting contract deployment monitoring...');
    
    setInterval(async () => {
      try {
        const currentBlock = await client.getBlockNumber();
        
        if (currentBlock > this.lastProcessedBlock) {
          console.log(`🔍 Scanning blocks ${this.lastProcessedBlock + 1n} to ${currentBlock}`);
          
          for (let blockNum = this.lastProcessedBlock + 1n; blockNum <= currentBlock; blockNum++) {
            await this.scanBlockForDeployments(blockNum);
          }
          
          this.lastProcessedBlock = currentBlock;
        }
      } catch (error) {
        console.error('Error in contract deployment monitoring:', error);
      }
    }, 10000); // Check every 10 seconds
  }

  private async scanBlockForDeployments(blockNumber: bigint): void {
    try {
      const block = await client.getBlock({
        blockNumber,
        includeTransactions: true,
      });

      const deploymentTxs = block.transactions.filter(tx => 
        typeof tx === 'object' && tx.to === null
      );

      for (const tx of deploymentTxs) {
        if (typeof tx === 'object') {
          await this.processDeploymentTransaction(tx, Number(blockNumber));
        }
      }
    } catch (error) {
      console.error(`Error scanning block ${blockNumber}:`, error);
    }
  }

  private async processDeploymentTransaction(tx: any, blockNumber: number): void {
    try {
      // Get transaction receipt to find deployed contract address
      const receipt = await client.getTransactionReceipt({ hash: tx.hash });
      
      if (!receipt.contractAddress) return;

      const contractAddress = receipt.contractAddress;
      
      // Check if it's an ERC-20 token
      const tokenInfo = await this.analyzeContract(contractAddress);
      
      if (tokenInfo.isERC20) {
        const discovery: ComprehensiveTokenDiscovery = {
          address: contractAddress,
          name: tokenInfo.name,
          symbol: tokenInfo.symbol,
          decimals: tokenInfo.decimals,
          totalSupply: tokenInfo.totalSupply,
          creator: tx.from,
          deploymentTx: tx.hash,
          blockNumber,
          timestamp: Date.now(),
          discoveryMethod: 'contract_deployment',
          dexListings: [],
          metadata: {
            isERC20: true,
            hasLiquidity: false,
            initialSupply: tokenInfo.totalSupply,
            contractSize: tx.input?.length || 0,
          },
        };

        this.discoveries.set(contractAddress, discovery);
        console.log(`🆕 NEW TOKEN DEPLOYED: ${tokenInfo.symbol} (${tokenInfo.name})`);
        console.log(`📍 Address: ${contractAddress}`);
        console.log(`👤 Creator: ${tx.from}`);
      }
    } catch (error) {
      console.error('Error processing deployment transaction:', error);
    }
  }

  // Strategy 2: Transfer Event Monitoring (Token Mints)
  private async monitorTransferEvents(): void {
    console.log('🪙 Starting transfer event monitoring...');
    
    setInterval(async () => {
      try {
        const transferLogs = await client.getLogs({
          event: parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 value)'),
          args: {
            from: '0x0000000000000000000000000000000000000000',
          },
          fromBlock: this.lastProcessedBlock,
          toBlock: 'latest',
        });

        for (const log of transferLogs) {
          await this.processTransferEvent(log);
        }
      } catch (error) {
        console.error('Error monitoring transfer events:', error);
      }
    }, 15000); // Check every 15 seconds
  }

  private async processTransferEvent(log: any): void {
    try {
      const tokenAddress = log.address;
      
      // Skip if we already discovered this token
      if (this.discoveries.has(tokenAddress)) {
        // Update existing discovery with mint info
        const existing = this.discoveries.get(tokenAddress)!;
        existing.metadata.firstMintRecipient = log.args.to;
        return;
      }

      // Analyze new token
      const tokenInfo = await this.analyzeContract(tokenAddress);
      
      if (tokenInfo.isERC20) {
        const discovery: ComprehensiveTokenDiscovery = {
          address: tokenAddress,
          name: tokenInfo.name,
          symbol: tokenInfo.symbol,
          decimals: tokenInfo.decimals,
          totalSupply: tokenInfo.totalSupply,
          creator: '0x0000000000000000000000000000000000000000', // Unknown from mint event
          deploymentTx: log.transactionHash,
          blockNumber: Number(log.blockNumber),
          timestamp: Date.now(),
          discoveryMethod: 'transfer_event',
          dexListings: [],
          metadata: {
            isERC20: true,
            hasLiquidity: false,
            firstMintRecipient: log.args.to,
            contractSize: 0,
          },
        };

        this.discoveries.set(tokenAddress, discovery);
        console.log(`🪙 NEW TOKEN VIA MINT: ${tokenInfo.symbol} (${tokenInfo.name})`);
        console.log(`🎯 First recipient: ${log.args.to}`);
      }
    } catch (error) {
      console.error('Error processing transfer event:', error);
    }
  }

  // Strategy 3: DEX Listing Monitoring
  private async monitorDEXListings(): void {
    console.log('🔄 Starting DEX listing monitoring...');
    
    // Monitor DexScreener API
    setInterval(async () => {
      try {
        await this.checkDexScreenerAPI();
      } catch (error) {
        console.error('Error checking DexScreener:', error);
      }
    }, 30000); // Check every 30 seconds

    // Monitor known DEX factories (when addresses are found)
    setInterval(async () => {
      try {
        await this.monitorDEXFactories();
      } catch (error) {
        console.error('Error monitoring DEX factories:', error);
      }
    }, 20000); // Check every 20 seconds
  }

  private async checkDexScreenerAPI(): void {
    try {
      // Note: DexScreener might not support Abstract yet
      const response = await fetch('https://api.dexscreener.com/latest/dex/pairs/abstract');
      
      if (response.ok) {
        const data = await response.json();
        
        for (const pair of data.pairs || []) {
          await this.processDEXPair(pair, 'DexScreener');
        }
      }
    } catch (error) {
      // DexScreener might not support Abstract yet - silent fail
    }
  }

  private async monitorDEXFactories(): void {
    // TODO: Add known DEX factory addresses when discovered
    const knownFactories = [
      // '0x...', // PancakeSwap Factory
      // '0x...', // Native Abstract DEX
    ];

    for (const factory of knownFactories) {
      try {
        const pairLogs = await client.getLogs({
          address: factory as `0x${string}`,
          event: parseAbiItem('event PairCreated(address indexed token0, address indexed token1, address pair, uint256)'),
          fromBlock: this.lastProcessedBlock,
          toBlock: 'latest',
        });

        for (const log of pairLogs) {
          await this.processPairCreated(log, 'DEX_Factory');
        }
      } catch (error) {
        console.error(`Error monitoring factory ${factory}:`, error);
      }
    }
  }

  private async processDEXPair(pair: any, source: string): void {
    // Extract token addresses from pair data
    const tokenA = pair.baseToken?.address;
    const tokenB = pair.quoteToken?.address;

    for (const tokenAddr of [tokenA, tokenB]) {
      if (!tokenAddr || this.discoveries.has(tokenAddr)) continue;

      const tokenInfo = await this.analyzeContract(tokenAddr);
      
      if (tokenInfo.isERC20) {
        const discovery: ComprehensiveTokenDiscovery = {
          address: tokenAddr,
          name: tokenInfo.name,
          symbol: tokenInfo.symbol,
          decimals: tokenInfo.decimals,
          totalSupply: tokenInfo.totalSupply,
          creator: '0x0000000000000000000000000000000000000000',
          deploymentTx: '',
          blockNumber: 0,
          timestamp: Date.now(),
          discoveryMethod: 'dex_listing',
          dexListings: [{
            dex: source,
            pairAddress: pair.pairAddress,
            baseToken: pair.baseToken?.address,
            quoteToken: pair.quoteToken?.address,
          }],
          metadata: {
            isERC20: true,
            hasLiquidity: true,
            contractSize: 0,
          },
        };

        this.discoveries.set(tokenAddr, discovery);
        console.log(`🔄 NEW TOKEN VIA DEX: ${tokenInfo.symbol} on ${source}`);
      }
    }
  }

  private async processPairCreated(log: any, source: string): void {
    const { token0, token1, pair } = log.args;
    
    for (const tokenAddr of [token0, token1]) {
      if (this.discoveries.has(tokenAddr)) {
        // Update existing with DEX listing
        const existing = this.discoveries.get(tokenAddr)!;
        existing.dexListings.push({
          dex: source,
          pairAddress: pair,
          baseToken: token0,
          quoteToken: token1,
        });
        existing.metadata.hasLiquidity = true;
      } else {
        // Process as new token
        const tokenInfo = await this.analyzeContract(tokenAddr);
        // ... similar to processDEXPair
      }
    }
  }

  // Contract Analysis Helper
  private async analyzeContract(address: string): Promise<any> {
    try {
      const [name, symbol, decimals, totalSupply] = await Promise.all([
        this.safeContractCall(address, 'function name() view returns (string)', 'name'),
        this.safeContractCall(address, 'function symbol() view returns (string)', 'symbol'),
        this.safeContractCall(address, 'function decimals() view returns (uint8)', 'decimals'),
        this.safeContractCall(address, 'function totalSupply() view returns (uint256)', 'totalSupply'),
      ]);

      return {
        isERC20: !!(name && symbol && decimals !== null),
        name: name || 'Unknown Token',
        symbol: symbol || 'UNK',
        decimals: decimals || 18,
        totalSupply: totalSupply ? formatEther(totalSupply) : '0',
      };
    } catch (error) {
      return {
        isERC20: false,
        name: null,
        symbol: null,
        decimals: null,
        totalSupply: null,
      };
    }
  }

  private async safeContractCall(address: string, abi: string, functionName: string): Promise<any> {
    try {
      return await client.readContract({
        address: address as `0x${string}`,
        abi: [parseAbiItem(abi)],
        functionName,
      });
    } catch (error) {
      return null;
    }
  }

  // Public API for UI
  getAllDiscoveredTokens(): ComprehensiveTokenDiscovery[] {
    return Array.from(this.discoveries.values())
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  getTokensByMethod(method: string): ComprehensiveTokenDiscovery[] {
    return this.getAllDiscoveredTokens()
      .filter(token => token.discoveryMethod === method);
  }

  getStats() {
    const tokens = this.getAllDiscoveredTokens();
    return {
      totalTokens: tokens.length,
      byMethod: {
        contract_deployment: tokens.filter(t => t.discoveryMethod === 'contract_deployment').length,
        transfer_event: tokens.filter(t => t.discoveryMethod === 'transfer_event').length,
        dex_listing: tokens.filter(t => t.discoveryMethod === 'dex_listing').length,
      },
      withLiquidity: tokens.filter(t => t.metadata.hasLiquidity).length,
      lastUpdate: new Date().toISOString(),
    };
  }

  // Convert to UI format
  getUIFormattedTokens(): any[] {
    return this.getAllDiscoveredTokens().map(token => ({
      id: token.address,
      address: token.address,
      name: token.name || 'Unknown Token',
      symbol: token.symbol || 'UNK',
      price: Math.random() * 0.01, // TODO: Get real price
      priceChange24h: (Math.random() - 0.5) * 20,
      volume24h: Math.random() * 10000,
      marketCap: Math.random() * 1000000,
      liquidity: token.metadata.hasLiquidity ? Math.random() * 50000 : 0,
      createdAt: token.timestamp,
      dex: token.dexListings[0]?.dex || token.discoveryMethod,
      discoveryMethod: token.discoveryMethod,
      metadata: token.metadata,
    }));
  }
}

// Singleton instance
export const comprehensiveMonitor = new ComprehensiveTokenMonitor();

// Start monitoring function
export async function startComprehensiveMonitoring(): Promise<void> {
  await comprehensiveMonitor.startComprehensiveMonitoring();
}