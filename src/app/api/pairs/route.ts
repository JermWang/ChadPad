import { NextRequest, NextResponse } from 'next/server';
import { TokenPair, ApiResponse, ParsedTokenData } from '@/lib/types';
import { telegramParser } from '@/lib/telegram';
import { blockchainService } from '@/lib/blockchain';
import { cache } from '@/lib/cache';
import { generateTokenId } from '@/lib/utils';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const search = searchParams.get('search')?.toLowerCase() || '';
    const minLiquidity = parseFloat(searchParams.get('minLiquidity') || '0');
    const maxAge = parseInt(searchParams.get('maxAge') || '24'); // hours
    const verified = searchParams.get('verified');
    const sortBy = searchParams.get('sortBy') || 'deployTime';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const refresh = searchParams.get('refresh') === 'true';

    const cacheKey = `token_pairs:${JSON.stringify({
      search, minLiquidity, maxAge, verified, sortBy, sortOrder, limit, offset
    })}`;

    // Check cache first unless refresh is requested
    if (!refresh) {
      const cached = await cache.get<any>(cacheKey);
      if (cached) {
        return NextResponse.json(cached);
      }
    }

    // Fetch and parse Telegram messages
    const telegramMessages = await telegramParser.fetchRecentMessages(100);
    const parsedTokens: TokenPair[] = [];

    for (const message of telegramMessages) {
      if (message.parsed?.tokenAddress) {
        try {
          // Get token metadata from blockchain
          const metadata = await blockchainService.getTokenMetadata(message.parsed.tokenAddress);
          
          if (metadata) {
            const tokenPair: TokenPair = {
              id: generateTokenId(message.parsed.tokenAddress, message.date),
              address: message.parsed.tokenAddress,
              name: message.parsed.tokenName || metadata.name || 'Unknown Token',
              symbol: message.parsed.tokenSymbol || metadata.symbol || 'UNK',
              decimals: metadata.decimals || 18,
              deployTime: message.date,
              creator: message.parsed.creatorAddress || '0x0000000000000000000000000000000000000000',
              verified: metadata.verified || false,
              tags: [],
            };

            // Enrich with market data
            const enrichedToken = await blockchainService.enrichTokenData(tokenPair);
            parsedTokens.push(enrichedToken);
          }
        } catch (error) {
          console.error(`Error processing token ${message.parsed.tokenAddress}:`, error);
        }
      }
    }

    // If no tokens from Telegram, fall back to mock data
    if (parsedTokens.length === 0) {
      console.log('No tokens from Telegram, falling back to mock data');
      // Call mock endpoint and return its data
      const mockResponse = await fetch(`${request.url.replace('/pairs', '/mockPairs')}`);
      const mockData = await mockResponse.json();
      return NextResponse.json(mockData);
    }

    // Apply filters to parsed tokens
    let filteredTokens = [...parsedTokens];

    if (search) {
      filteredTokens = filteredTokens.filter(token =>
        token.name.toLowerCase().includes(search) ||
        token.symbol.toLowerCase().includes(search) ||
        token.address.toLowerCase().includes(search)
      );
    }

    if (minLiquidity > 0) {
      filteredTokens = filteredTokens.filter(token =>
        (token.liquidity || 0) >= minLiquidity
      );
    }

    if (maxAge < 24) {
      const maxAgeMs = maxAge * 60 * 60 * 1000;
      const cutoffTime = new Date(Date.now() - maxAgeMs);
      filteredTokens = filteredTokens.filter(token =>
        token.deployTime >= cutoffTime
      );
    }

    if (verified !== null && verified !== undefined) {
      const isVerified = verified === 'true';
      filteredTokens = filteredTokens.filter(token =>
        token.verified === isVerified
      );
    }

    // Apply sorting
    filteredTokens.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortBy) {
        case 'name':
          aValue = a.name;
          bValue = b.name;
          break;
        case 'liquidity':
          aValue = a.liquidity || 0;
          bValue = b.liquidity || 0;
          break;
        case 'volume24h':
          aValue = a.volume24h || 0;
          bValue = b.volume24h || 0;
          break;
        case 'marketCap':
          aValue = a.marketCap || 0;
          bValue = b.marketCap || 0;
          break;
        case 'deployTime':
        default:
          aValue = a.deployTime.getTime();
          bValue = b.deployTime.getTime();
          break;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    // Apply pagination
    const total = filteredTokens.length;
    const paginatedTokens = filteredTokens.slice(offset, offset + limit);

    const response: ApiResponse<{
      tokens: TokenPair[];
      pagination: {
        total: number;
        offset: number;
        limit: number;
        hasMore: boolean;
      };
    }> = {
      success: true,
      data: {
        tokens: paginatedTokens,
        pagination: {
          total,
          offset,
          limit,
          hasMore: offset + limit < total,
        },
      },
      timestamp: Date.now(),
    };

    // Cache the response for 1 minute
    await cache.set(cacheKey, response, 60000);

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching token pairs:', error);
    
    const errorResponse: ApiResponse<null> = {
      success: false,
      error: 'Failed to fetch token pairs',
      timestamp: Date.now(),
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Handle Telegram webhook
    const body = await request.json();
    
    const message = telegramParser.processWebhookMessage(body);
    if (!message || !message.parsed?.tokenAddress) {
      return NextResponse.json({ success: true, processed: false });
    }

    // Process the new token
    try {
      const metadata = await blockchainService.getTokenMetadata(message.parsed.tokenAddress);
      
      if (metadata) {
        const tokenPair: TokenPair = {
          id: generateTokenId(message.parsed.tokenAddress, message.date),
          address: message.parsed.tokenAddress,
          name: message.parsed.tokenName || metadata.name || 'Unknown Token',
          symbol: message.parsed.tokenSymbol || metadata.symbol || 'UNK',
          decimals: metadata.decimals || 18,
          deployTime: message.date,
          creator: message.parsed.creatorAddress || '0x0000000000000000000000000000000000000000',
          verified: metadata.verified || false,
          tags: ['new'],
        };

        // Enrich with market data
        const enrichedToken = await blockchainService.enrichTokenData(tokenPair);
        
        // Cache the new token
        await cache.set(`new_token:${enrichedToken.id}`, enrichedToken, 300000);
        
        // Clear relevant caches to force refresh
        const keys = await cache.get<string[]>('cache_keys') || [];
        for (const key of keys) {
          if (key.startsWith('token_pairs:')) {
            await cache.del(key);
          }
        }

        return NextResponse.json({ 
          success: true, 
          processed: true, 
          token: enrichedToken 
        });
      }
    } catch (error) {
      console.error(`Error processing webhook token ${message.parsed.tokenAddress}:`, error);
    }

    return NextResponse.json({ success: true, processed: false });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json({ success: false, error: 'Webhook processing failed' }, { status: 500 });
  }
}