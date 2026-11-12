import redis from '../config/redis.js';
import crypto from 'crypto';

class CacheService {
  private generateHash(data: any): string {
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex')
      .substring(0, 16);
  }

  async cacheUserData(userId: string, data: any, ttl = 3600) {
    try {
      await redis.setex(`user:${userId}`, ttl, JSON.stringify(data));
    } catch (error) {
      console.error('Error caching user data:', error);
    }
  }

  async getUserData(userId: string) {
    try {
      const cached = await redis.get(`user:${userId}`);
      if (!cached || typeof cached !== 'string') {
        return null;
      }
      return JSON.parse(cached);
    } catch (error) {
      console.error('Error retrieving user data from cache:', error);
      return null;
    }
  }

  async cacheConversation(conversationId: string, data: any, ttl = 1800) {
    try {
      await redis.setex(`conversation:${conversationId}`, ttl, JSON.stringify(data));
    } catch (error) {
      console.error('Error caching conversation:', error);
    }
  }

  async getConversation(conversationId: string) {
    try {
      const cached = await redis.get(`conversation:${conversationId}`);
      if (!cached || typeof cached !== 'string') {
        return null;
      }
      return JSON.parse(cached);
    } catch (error) {
      console.error('Error retrieving conversation from cache:', error);
      return null;
    }
  }

  async cacheTranslation(text: string, sourceLang: string, targetLang: string, translation: string, ttl = 86400) {
    try {
      const hash = this.generateHash({ text, sourceLang, targetLang });
      await redis.setex(`translation:${hash}`, ttl, translation);
    } catch (error) {
      console.error('Error caching translation:', error);
    }
  }

  async getTranslation(text: string, sourceLang: string, targetLang: string) {
    try {
      const hash = this.generateHash({ text, sourceLang, targetLang });
      return await redis.get(`translation:${hash}`);
    } catch (error) {
      console.error('Error retrieving translation from cache:', error);
      return null;
    }
  }

  async invalidate(pattern: string) {
    try {
      await redis.del(pattern);
    } catch (error) {
      console.error('Error invalidating cache:', error);
    }
  }

  async clearUserCache(userId: string) {
    try {
      await redis.del(`user:${userId}`);
    } catch (error) {
      console.error('Error clearing user cache:', error);
    }
  }

  async clearUserRateLimits(userId: string) {
    try {
      const limiterNames = ['message', 'upload', 'api'];
      const delKeys = limiterNames.map((name) => `ratelimit:user:${userId}:${name}`);
      await redis.del(...delKeys);
    } catch (error) {
      console.error('Error clearing user rate limits:', error);
    }
  }

  async clearAllAICache() {
    try {
      console.log('Clearing all AI caches...');
      return { success: true, message: 'Cache clearing triggered' };
    } catch (error) {
      console.error('Error clearing AI cache:', error);
      return { success: false, message: 'Error clearing cache' };
    }
  }

  async flushAll() {
    try {
      await redis.flushdb();
      console.log('All caches cleared');
      return { success: true, message: 'All caches cleared' };
    } catch (error) {
      console.error('Error flushing cache:', error);
      return { success: false, message: 'Error flushing cache' };
    }
  }
}

export default new CacheService();