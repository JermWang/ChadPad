export interface TokenPair {
  id: string;
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  deployTime: Date;
  creator: string;
  liquidity?: number;
  volume24h?: number;
  price?: number;
  priceChange24h?: number;
  marketCap?: number;
  dexUrl?: string;
  verified: boolean;
  tags?: string[];
}

export interface TelegramMessage {
  messageId: number;
  channelId: string;
  text: string;
  date: Date;
  parsed?: ParsedTokenData;
}

export interface ParsedTokenData {
  tokenAddress?: string;
  tokenName?: string;
  tokenSymbol?: string;
  creatorAddress?: string;
  deployTxHash?: string;
  initialLiquidity?: number;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export type SortableTokenField = 'name' | 'deployTime' | 'liquidity' | 'volume24h' | 'marketCap';

export interface FilterOptions {
  search?: string;
  minLiquidity?: number;
  maxAge?: number; // in hours
  verified?: boolean;
  sortBy?: SortableTokenField;
  sortOrder?: 'asc' | 'desc';
}

export interface UserTokenBalance {
  address: string;
  balance: bigint;
  hasAccess: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
}