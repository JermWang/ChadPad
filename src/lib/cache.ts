import { createClient, RedisClientType } from 'redis';
import { config } from './config';
import { CacheEntry } from './types';

class CacheManager {
  private redisClient: RedisClientType | null = null;
  private memoryCache = new Map<string, CacheEntry<any>>();
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;

    try {
      if (config.redis.url && config.redis.url !== 'redis://localhost:6379') {
        this.redisClient = createClient({ url: config.redis.url });
        await this.redisClient.connect();
        console.log('Redis cache connected');
      } else {
        console.log('Using in-memory cache');
      }
    } catch (error) {
      console.warn('Redis connection failed, falling back to memory cache:', error);
      this.redisClient = null;
    }

    this.initialized = true;
  }

  async get<T>(key: string): Promise<T | null> {
    await this.init();

    try {
      if (this.redisClient) {
        const data = await this.redisClient.get(key);
        if (data) {
          const entry: CacheEntry<T> = JSON.parse(data);
          if (Date.now() - entry.timestamp < entry.ttl) {
            return entry.data;
          } else {
            await this.redisClient.del(key);
          }
        }
      } else {
        const entry = this.memoryCache.get(key);
        if (entry && Date.now() - entry.timestamp < entry.ttl) {
          return entry.data;
        } else if (entry) {
          this.memoryCache.delete(key);
        }
      }
    } catch (error) {
      console.error('Cache get error:', error);
    }

    return null;
  }

  async set<T>(key: string, data: T, ttl: number = config.app.cacheTimeout): Promise<void> {
    await this.init();

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
    };

    try {
      if (this.redisClient) {
        await this.redisClient.setEx(key, Math.floor(ttl / 1000), JSON.stringify(entry));
      } else {
        this.memoryCache.set(key, entry);
        // Clean up expired entries
        this.cleanupMemoryCache();
      }
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  async del(key: string): Promise<void> {
    await this.init();

    try {
      if (this.redisClient) {
        await this.redisClient.del(key);
      } else {
        this.memoryCache.delete(key);
      }
    } catch (error) {
      console.error('Cache del error:', error);
    }
  }

  async clear(): Promise<void> {
    await this.init();

    try {
      if (this.redisClient) {
        await this.redisClient.flushAll();
      } else {
        this.memoryCache.clear();
      }
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  }

  private cleanupMemoryCache(): void {
    const now = Date.now();
    const entries = Array.from(this.memoryCache.entries());
    for (const [key, entry] of entries) {
      if (now - entry.timestamp >= entry.ttl) {
        this.memoryCache.delete(key);
      }
    }
  }

  async disconnect(): Promise<void> {
    if (this.redisClient) {
      await this.redisClient.disconnect();
    }
  }
}

export const cache = new CacheManager();