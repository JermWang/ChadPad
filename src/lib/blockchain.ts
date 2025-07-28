import { TokenPair, UserTokenBalance } from './types';
import { cache } from './cache';
import { config } from './config';

// Standard ERC-20 ABI for token interactions
const ERC20_ABI = [
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'name',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'totalSupply',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export class BlockchainService {
  private client: any = null;

  private async getClient() {
    if (!this.client) {
      // Dynamic import to avoid SSR issues
      const { createPublicClient, http } = await import('viem');
      const { abstractTestnet } = await import('./wagmi');
      
      this.client = createPublicClient({
        chain: abstractTestnet,
        transport: http(config.abstract.rpcUrl),
      });
    }
    return this.client;
  }

  /**
   * Check if a user holds the required token balance for access
   */
  async checkTokenAccess(userAddress: string): Promise<UserTokenBalance> {
    const cacheKey = `token_balance:${userAddress}`;
    const cached = await cache.get<UserTokenBalance>(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const { getContract, parseUnits } = await import('viem');
      const client = await this.getClient();
      
      const contract = getContract({
        address: config.abstract.requiredTokenAddress as `0x${string}`,
        abi: ERC20_ABI,
        client: client,
      }) as any;

      const balance = await contract.read.balanceOf([userAddress as `0x${string}`]);
      const requiredBalance = parseUnits(config.app.requiredTokenBalance, 18);
      
      const result: UserTokenBalance = {
        address: userAddress,
        balance,
        hasAccess: balance >= requiredBalance,
      };

      // Cache for 5 minutes
      await cache.set(cacheKey, result, 300000);
      return result;
    } catch (error) {
      console.error('Error checking token balance:', error);
      return {
        address: userAddress,
        balance: BigInt(0),
        hasAccess: false,
      };
    }
  }

  /**
   * Get token metadata from the blockchain
   */
  async getTokenMetadata(tokenAddress: string): Promise<Partial<TokenPair> | null> {
    const cacheKey = `token_metadata:${tokenAddress}`;
    const cached = await cache.get<Partial<TokenPair>>(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const { getContract } = await import('viem');
      const client = await this.getClient();
      
      const contract = getContract({
        address: tokenAddress as `0x${string}`,
        abi: ERC20_ABI,
        client: client,
      }) as any;

      const [name, symbol, decimals, totalSupply] = await Promise.all([
        contract.read.name().catch(() => 'Unknown'),
        contract.read.symbol().catch(() => 'UNK'),
        contract.read.decimals().catch(() => 18),
        contract.read.totalSupply().catch(() => BigInt(0)),
      ]);

      const metadata: Partial<TokenPair> = {
        address: tokenAddress,
        name,
        symbol,
        decimals,
        verified: true, // If we can read metadata, consider it verified
      };

      // Cache for 1 hour
      await cache.set(cacheKey, metadata, 3600000);
      return metadata;
    } catch (error) {
      console.error('Error fetching token metadata:', error);
      return null;
    }
  }

  /**
   * Get transaction details for token deployment
   */
  async getTransactionDetails(txHash: string): Promise<any> {
    const cacheKey = `tx_details:${txHash}`;
    const cached = await cache.get(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const client = await this.getClient();
      
      const transaction = await client.getTransaction({
        hash: txHash as `0x${string}`,
      });

      const receipt = await client.getTransactionReceipt({
        hash: txHash as `0x${string}`,
      });

      const result = {
        transaction,
        receipt,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed,
        status: receipt.status,
      };

      // Cache for 24 hours (transactions are immutable)
      await cache.set(cacheKey, result, 86400000);
      return result;
    } catch (error) {
      console.error('Error fetching transaction details:', error);
      return null;
    }
  }

  /**
   * Get the latest block number
   */
  async getLatestBlockNumber(): Promise<bigint> {
    try {
      const client = await this.getClient();
      return await client.getBlockNumber();
    } catch (error) {
      console.error('Error fetching latest block number:', error);
      return BigInt(0);
    }
  }

  /**
   * Simulate on-chain data enrichment for token pairs
   * In a real implementation, this would integrate with DEX APIs or indexers
   */
  async enrichTokenData(tokenPair: TokenPair): Promise<TokenPair> {
    const cacheKey = `enriched_token:${tokenPair.address}`;
    const cached = await cache.get<TokenPair>(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      // In a real implementation, you would:
      // 1. Query DEX APIs for liquidity and volume data
      // 2. Get price information from oracles or DEXes
      // 3. Calculate market cap based on total supply and price
      // 4. Check if the token is listed on verified exchanges

      // For now, we'll simulate this data
      const enrichedData: Partial<TokenPair> = {
        liquidity: Math.random() * 100000, // Random liquidity between 0-100k
        volume24h: Math.random() * 50000, // Random 24h volume
        price: Math.random() * 10, // Random price
        priceChange24h: (Math.random() - 0.5) * 20, // Random change between -10% and +10%
        marketCap: 0, // Will be calculated if we have total supply and price
        dexUrl: `https://dex.abstract.money/swap?token=${tokenPair.address}`,
      };

      const enrichedToken: TokenPair = {
        ...tokenPair,
        ...enrichedData,
      };

      // Cache for 1 minute (market data changes frequently)
      await cache.set(cacheKey, enrichedToken, 60000);
      return enrichedToken;
    } catch (error) {
      console.error('Error enriching token data:', error);
      return tokenPair;
    }
  }

  /**
   * Get formatted token balance for display
   */
  async formatTokenBalance(balance: bigint, decimals: number = 18): Promise<string> {
    const { formatUnits } = await import('viem');
    return formatUnits(balance, decimals);
  }

  /**
   * Check if an address is a valid contract
   */
  async isContract(address: string): Promise<boolean> {
    try {
      const client = await this.getClient();
      const bytecode = await client.getBytecode({
        address: address as `0x${string}`,
      });
      return bytecode !== undefined && bytecode !== '0x';
    } catch (error) {
      console.error('Error checking if address is contract:', error);
      return false;
    }
  }
}

export const blockchainService = new BlockchainService();