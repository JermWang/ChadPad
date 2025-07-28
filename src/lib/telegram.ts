import TelegramBot from 'node-telegram-bot-api';
import { config } from './config';
import { TelegramMessage, ParsedTokenData } from './types';
import { isValidEthereumAddress } from './utils';

export class TelegramParser {
  private bot: TelegramBot | null = null;

  constructor() {
    if (config.telegram.botToken) {
      this.bot = new TelegramBot(config.telegram.botToken, { polling: false });
    }
  }

  /**
   * Parse a Telegram message to extract token deployment information
   */
  parseTokenMessage(message: string): ParsedTokenData | null {
    const parsed: ParsedTokenData = {};

    // Common patterns for token deployment messages
    const patterns = {
      // Token address patterns
      tokenAddress: [
        /(?:token|contract|address)[:\s]*(?:0x[a-fA-F0-9]{40})/i,
        /0x[a-fA-F0-9]{40}/g,
      ],
      // Token name patterns
      tokenName: [
        /(?:token|name)[:\s]*([A-Za-z0-9\s]+)/i,
        /deployed[:\s]*([A-Za-z0-9\s]+)/i,
      ],
      // Token symbol patterns
      tokenSymbol: [
        /(?:symbol|ticker)[:\s]*([A-Z]{2,10})/i,
        /\$([A-Z]{2,10})/g,
      ],
      // Creator address patterns
      creatorAddress: [
        /(?:creator|deployer|by)[:\s]*(?:0x[a-fA-F0-9]{40})/i,
      ],
      // Transaction hash patterns
      deployTxHash: [
        /(?:tx|transaction|hash)[:\s]*(?:0x[a-fA-F0-9]{64})/i,
      ],
      // Liquidity patterns
      initialLiquidity: [
        /(?:liquidity|pool)[:\s]*([0-9,.]+)\s*(?:ETH|WETH)/i,
      ],
    };

    // Extract token address
    for (const pattern of patterns.tokenAddress) {
      const match = message.match(pattern);
      if (match) {
        const address = match[0].includes('0x') ? match[0].match(/0x[a-fA-F0-9]{40}/)?.[0] : null;
        if (address && isValidEthereumAddress(address)) {
          parsed.tokenAddress = address;
          break;
        }
      }
    }

    // Extract token name
    for (const pattern of patterns.tokenName) {
      const match = message.match(pattern);
      if (match && match[1]) {
        parsed.tokenName = match[1].trim();
        break;
      }
    }

    // Extract token symbol
    for (const pattern of patterns.tokenSymbol) {
      const matches = Array.from(message.matchAll(pattern));
      if (matches.length > 0) {
        parsed.tokenSymbol = matches[0][1];
        break;
      }
    }

    // Extract creator address
    for (const pattern of patterns.creatorAddress) {
      const match = message.match(pattern);
      if (match) {
        const address = match[0].match(/0x[a-fA-F0-9]{40}/)?.[0];
        if (address && isValidEthereumAddress(address)) {
          parsed.creatorAddress = address;
          break;
        }
      }
    }

    // Extract transaction hash
    for (const pattern of patterns.deployTxHash) {
      const match = message.match(pattern);
      if (match) {
        const txHash = match[0].match(/0x[a-fA-F0-9]{64}/)?.[0];
        if (txHash) {
          parsed.deployTxHash = txHash;
          break;
        }
      }
    }

    // Extract initial liquidity
    for (const pattern of patterns.initialLiquidity) {
      const match = message.match(pattern);
      if (match && match[1]) {
        const liquidityStr = match[1].replace(/,/g, '');
        const liquidity = parseFloat(liquidityStr);
        if (!isNaN(liquidity)) {
          parsed.initialLiquidity = liquidity;
          break;
        }
      }
    }

    // Return parsed data only if we found at least a token address
    return parsed.tokenAddress ? parsed : null;
  }

  /**
   * Fetch recent messages from the configured Telegram channel
   */
  async fetchRecentMessages(limit: number = 100): Promise<TelegramMessage[]> {
    if (!this.bot || !config.telegram.channelId) {
      console.warn('Telegram bot not configured');
      return [];
    }

    try {
      const updates = await this.bot.getUpdates({ limit });
      const messages: TelegramMessage[] = [];

      for (const update of updates) {
        if (update.channel_post || update.message) {
          const msg = update.channel_post || update.message!;
          if (msg.text) {
            const telegramMessage: TelegramMessage = {
              messageId: msg.message_id,
              channelId: msg.chat.id.toString(),
              text: msg.text,
              date: new Date(msg.date * 1000),
            };

            // Parse the message for token data
            const parsed = this.parseTokenMessage(msg.text);
            if (parsed) {
              telegramMessage.parsed = parsed;
            }

            messages.push(telegramMessage);
          }
        }
      }

      return messages.sort((a, b) => b.date.getTime() - a.date.getTime());
    } catch (error) {
      console.error('Error fetching Telegram messages:', error);
      return [];
    }
  }

  /**
   * Set up webhook for real-time message processing
   */
  async setupWebhook(webhookUrl: string): Promise<boolean> {
    if (!this.bot) {
      return false;
    }

    try {
      await this.bot.setWebHook(webhookUrl);
      return true;
    } catch (error) {
      console.error('Error setting up webhook:', error);
      return false;
    }
  }

  /**
   * Process incoming webhook message
   */
  processWebhookMessage(body: any): TelegramMessage | null {
    if (!body.channel_post && !body.message) {
      return null;
    }

    const msg = body.channel_post || body.message;
    if (!msg.text) {
      return null;
    }

    const telegramMessage: TelegramMessage = {
      messageId: msg.message_id,
      channelId: msg.chat.id.toString(),
      text: msg.text,
      date: new Date(msg.date * 1000),
    };

    // Parse the message for token data
    const parsed = this.parseTokenMessage(msg.text);
    if (parsed) {
      telegramMessage.parsed = parsed;
    }

    return telegramMessage;
  }
}

export const telegramParser = new TelegramParser();