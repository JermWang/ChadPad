import { abstractAPI, TokenPair } from './abstract-api';

export interface TelegramMessage {
  message_id: number;
  text: string;
  date: number;
  chat: {
    id: number;
    title?: string;
    username?: string;
  };
  from?: {
    id: number;
    username?: string;
    first_name?: string;
  };
}

export interface ParsedTokenInfo {
  address: string;
  symbol?: string;
  name?: string;
  description?: string;
  website?: string;
  twitter?: string;
  telegram?: string;
  deployer?: string;
  timestamp: number;
  source: string;
}

export class TelegramTokenMonitor {
  private botToken: string;
  private channelIds: string[];
  private webhookUrl?: string;
  private cache = new Map<string, ParsedTokenInfo>();
  
  // Enhanced regex patterns for token discovery
  private patterns = {
    // Contract addresses
    contractAddress: /(?:0x)?[a-fA-F0-9]{40}/g,
    
    // Token deployment patterns
    tokenDeploy: [
      /(?:new\s+)?token\s+(?:deployed|created|launched):?\s*([a-zA-Z0-9$]+)/i,
      /(?:deployed|created|launched)\s+([a-zA-Z0-9$]+)\s+token/i,
      /\$([a-zA-Z0-9]+)\s+(?:is\s+)?(?:live|deployed|launched)/i,
    ],
    
    // Token information extraction
    tokenSymbol: /\$([A-Z0-9]{2,10})/g,
    tokenName: /(?:token\s+name|name):\s*([^\n\r]+)/i,
    website: /(?:website|site):\s*(https?:\/\/[^\s]+)/i,
    twitter: /(?:twitter|x):\s*(?:https?:\/\/)?(?:twitter\.com\/|x\.com\/)?@?([a-zA-Z0-9_]+)/i,
    telegram: /(?:telegram|tg):\s*(?:https?:\/\/)?t\.me\/([a-zA-Z0-9_]+)/i,
    
    // DEX/Pair creation
    pairCreated: /(?:pair|lp)\s+(?:created|added):\s*([a-zA-Z0-9$]+)\/([a-zA-Z0-9$]+)/i,
    uniswapPair: /uniswap\s+(?:v[23])?\s*pair:\s*([^\s]+)/i,
    
    // Price and market data
    marketCap: /(?:market\s*cap|mcap):\s*\$?([0-9,.]+[kmb]?)/i,
    liquidity: /(?:liquidity|liq):\s*\$?([0-9,.]+[kmb]?)/i,
    price: /price:\s*\$?([0-9,.]+)/i,
  };

  constructor(botToken: string, channelIds: string | string[]) {
    this.botToken = botToken;
    this.channelIds = Array.isArray(channelIds) ? channelIds : [channelIds];
  }

  // Set up webhook for real-time monitoring
  async setupWebhook(webhookUrl: string): Promise<boolean> {
    try {
      this.webhookUrl = webhookUrl;
      
      const response = await fetch(`https://api.telegram.org/bot${this.botToken}/setWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: webhookUrl,
          allowed_updates: ['message', 'channel_post'],
        }),
      });

      const result = await response.json();
      
      if (result.ok) {
        console.log('Telegram webhook set up successfully');
        return true;
      } else {
        console.error('Failed to set up webhook:', result.description);
        return false;
      }
    } catch (error) {
      console.error('Error setting up webhook:', error);
      return false;
    }
  }

  // Process incoming webhook messages
  async processWebhookMessage(message: TelegramMessage): Promise<ParsedTokenInfo[]> {
    try {
      // Check if message is from monitored channels
      const channelUsername = message.chat.username;
      const channelId = message.chat.id.toString();
      
      const isMonitoredChannel = this.channelIds.some(id => 
        id === channelUsername || id === `@${channelUsername}` || id === channelId
      );

      if (!isMonitoredChannel) {
        return [];
      }

      // Parse message for token information
      const parsedTokens = this.parseMessageForTokens(message);
      
      // Cache and return results
      parsedTokens.forEach(token => {
        this.cache.set(token.address, token);
      });

      return parsedTokens;
    } catch (error) {
      console.error('Error processing webhook message:', error);
      return [];
    }
  }

  // Parse message text for token information
  private parseMessageForTokens(message: TelegramMessage): ParsedTokenInfo[] {
    const text = message.text || '';
    const tokens: ParsedTokenInfo[] = [];

    // Extract contract addresses
    const addresses = this.extractContractAddresses(text);
    
    for (const address of addresses) {
      // Check if we've already processed this token recently
      if (this.cache.has(address)) {
        continue;
      }

      const tokenInfo: ParsedTokenInfo = {
        address,
        timestamp: message.date * 1000,
        source: `Telegram: ${message.chat.username || message.chat.id}`,
      };

      // Extract additional information
      tokenInfo.symbol = this.extractTokenSymbol(text, address);
      tokenInfo.name = this.extractTokenName(text);
      tokenInfo.website = this.extractWebsite(text);
      tokenInfo.twitter = this.extractTwitter(text);
      tokenInfo.telegram = this.extractTelegram(text);
      
      tokens.push(tokenInfo);
    }

    return tokens;
  }

  private extractContractAddresses(text: string): string[] {
    const matches = text.match(this.patterns.contractAddress) || [];
    return matches
      .map(addr => addr.startsWith('0x') ? addr : `0x${addr}`)
      .filter(addr => addr.length === 42); // Valid Ethereum address length
  }

  private extractTokenSymbol(text: string, address: string): string | undefined {
    // Look for token symbols near the address
    const symbolMatches = text.match(this.patterns.tokenSymbol);
    if (symbolMatches && symbolMatches.length > 0) {
      return symbolMatches[0].replace('$', '');
    }

    // Try to extract from deployment patterns
    for (const pattern of this.patterns.tokenDeploy) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].replace('$', '');
      }
    }

    return undefined;
  }

  private extractTokenName(text: string): string | undefined {
    const match = text.match(this.patterns.tokenName);
    return match ? match[1].trim() : undefined;
  }

  private extractWebsite(text: string): string | undefined {
    const match = text.match(this.patterns.website);
    return match ? match[1] : undefined;
  }

  private extractTwitter(text: string): string | undefined {
    const match = text.match(this.patterns.twitter);
    return match ? `https://twitter.com/${match[1]}` : undefined;
  }

  private extractTelegram(text: string): string | undefined {
    const match = text.match(this.patterns.telegram);
    return match ? `https://t.me/${match[1]}` : undefined;
  }

  // Get recent messages from channels (polling method)
  async pollChannelMessages(limit = 10): Promise<ParsedTokenInfo[]> {
    const allTokens: ParsedTokenInfo[] = [];

    for (const channelId of this.channelIds) {
      try {
        const messages = await this.getChannelMessages(channelId, limit);
        
        for (const message of messages) {
          const tokens = this.parseMessageForTokens(message);
          allTokens.push(...tokens);
        }
      } catch (error) {
        console.error(`Error polling channel ${channelId}:`, error);
      }
    }

    return allTokens;
  }

  private async getChannelMessages(channelId: string, limit: number): Promise<TelegramMessage[]> {
    try {
      const response = await fetch(
        `https://api.telegram.org/bot${this.botToken}/getChat?chat_id=${channelId}`
      );

      if (!response.ok) {
        throw new Error(`Failed to get channel info: ${response.statusText}`);
      }

      // Note: Getting channel messages requires bot to be admin
      // For public channels, you might need to use different approaches
      const messages: TelegramMessage[] = [];
      
      // This is a simplified version - in production you'd use getUpdates or webhook
      return messages;
    } catch (error) {
      console.error('Error getting channel messages:', error);
      return [];
    }
  }

  // Get cached token discoveries
  getCachedTokens(): ParsedTokenInfo[] {
    return Array.from(this.cache.values())
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  // Enhanced monitoring with multiple patterns
  async monitorMultipleChannels(): Promise<void> {
    setInterval(async () => {
      try {
        const newTokens = await this.pollChannelMessages(20);
        
        if (newTokens.length > 0) {
          console.log(`Discovered ${newTokens.length} new tokens from Telegram`);
          
          // Optionally trigger webhook or emit event
          this.onNewTokensDiscovered?.(newTokens);
        }
      } catch (error) {
        console.error('Error in monitoring loop:', error);
      }
    }, 30000); // Poll every 30 seconds
  }

  // Callback for new token discoveries
  onNewTokensDiscovered?: (tokens: ParsedTokenInfo[]) => void;

  // Integration with Abstract API
  async syncWithAbstractAPI(): Promise<void> {
    const cachedTokens = this.getCachedTokens();
    
    for (const token of cachedTokens) {
      try {
        // Fetch additional data from blockchain
        const tokenData = await abstractAPI.getTokenPrices([token.address]);
        
        if (tokenData[token.address]) {
          // Update cache with price data
          token.description = `Price: $${tokenData[token.address].price.toFixed(6)}`;
        }
      } catch (error) {
        console.error(`Error syncing token ${token.address}:`, error);
      }
    }
  }
}

// Utility function to create configured monitor
export function createTelegramMonitor(
  botToken: string, 
  channels: string | string[]
): TelegramTokenMonitor {
  return new TelegramTokenMonitor(botToken, channels);
}

// Export common patterns for customization
export const TOKEN_PATTERNS = {
  contractAddress: /(?:0x)?[a-fA-F0-9]{40}/g,
  tokenSymbol: /\$([A-Z0-9]{2,10})/g,
  pricePattern: /price:\s*\$?([0-9,.]+)/i,
  liquidityPattern: /(?:liquidity|liq):\s*\$?([0-9,.]+[kmb]?)/i,
};