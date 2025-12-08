import redis from '../config/redis.js';
import crypto from 'crypto';
class CacheService {
    generateHash(data) {
        return crypto
            .createHash('sha256')
            .update(JSON.stringify(data))
            .digest('hex')
            .substring(0, 16);
    }
    async cacheUserData(userId, data, ttl = 3600) {
        try {
            await redis.setex(`user:${userId}`, ttl, JSON.stringify(data));
        }
        catch (error) {
            console.error('Error caching user data:', error);
        }
    }
    async getUserData(userId) {
        try {
            const cached = await redis.get(`user:${userId}`);
            if (!cached || typeof cached !== 'string') {
                return null;
            }
            return JSON.parse(cached);
        }
        catch (error) {
            console.error('Error retrieving user data from cache:', error);
            return null;
        }
    }
    async cacheConversation(conversationId, data, ttl = 1800) {
        try {
            await redis.setex(`conversation:${conversationId}`, ttl, JSON.stringify(data));
        }
        catch (error) {
            console.error('Error caching conversation:', error);
        }
    }
    async getConversation(conversationId) {
        try {
            const cached = await redis.get(`conversation:${conversationId}`);
            if (!cached || typeof cached !== 'string') {
                return null;
            }
            return JSON.parse(cached);
        }
        catch (error) {
            console.error('Error retrieving conversation from cache:', error);
            return null;
        }
    }
    async cacheAIResponse(query, mode, response, ttl = 7200) {
        try {
            const hash = this.generateHash({ query, mode });
            const serialized = JSON.stringify(response);
            await redis.setex(`ai:${hash}`, ttl, serialized);
        }
        catch (error) {
            console.error('Error caching AI response:', error);
        }
    }
    async getAIResponse(query, mode) {
        try {
            const hash = this.generateHash({ query, mode });
            const cached = await redis.get(`ai:${hash}`);
            if (!cached) {
                return null;
            }
            if (typeof cached === 'string') {
                if (cached === '[object Object]' || cached.startsWith('[object')) {
                    console.warn('Invalid cached data detected, clearing cache');
                    await redis.del(`ai:${hash}`);
                    return null;
                }
                try {
                    return JSON.parse(cached);
                }
                catch (parseError) {
                    console.error('Error parsing cached AI response:', parseError);
                    await redis.del(`ai:${hash}`);
                    return null;
                }
            }
            return cached;
        }
        catch (error) {
            console.error('Error retrieving AI response from cache:', error);
            return null;
        }
    }
    async cacheTranslation(text, sourceLang, targetLang, translation, ttl = 86400) {
        try {
            const hash = this.generateHash({ text, sourceLang, targetLang });
            await redis.setex(`translation:${hash}`, ttl, translation);
        }
        catch (error) {
            console.error('Error caching translation:', error);
        }
    }
    async getTranslation(text, sourceLang, targetLang) {
        try {
            const hash = this.generateHash({ text, sourceLang, targetLang });
            return await redis.get(`translation:${hash}`);
        }
        catch (error) {
            console.error('Error retrieving translation from cache:', error);
            return null;
        }
    }
    async invalidate(pattern) {
        try {
            await redis.del(pattern);
        }
        catch (error) {
            console.error('Error invalidating cache:', error);
        }
    }
    async clearUserCache(userId) {
        try {
            await redis.del(`user:${userId}`);
        }
        catch (error) {
            console.error('Error clearing user cache:', error);
        }
    }
    async clearUserRateLimits(userId) {
        try {
            const limiterNames = ['message', 'upload', 'api'];
            const delKeys = limiterNames.map((name) => `ratelimit:user:${userId}:${name}`);
            await redis.del(...delKeys);
        }
        catch (error) {
            console.error('Error clearing user rate limits:', error);
        }
    }
    async clearAllAICache() {
        try {
            console.log('Clearing all AI caches...');
            return { success: true, message: 'Cache clearing triggered' };
        }
        catch (error) {
            console.error('Error clearing AI cache:', error);
            return { success: false, message: 'Error clearing cache' };
        }
    }
    async flushAll() {
        try {
            await redis.flushdb();
            console.log('All caches cleared');
            return { success: true, message: 'All caches cleared' };
        }
        catch (error) {
            console.error('Error flushing cache:', error);
            return { success: false, message: 'Error flushing cache' };
        }
    }
}
export default new CacheService();
//# sourceMappingURL=cache.service.js.map