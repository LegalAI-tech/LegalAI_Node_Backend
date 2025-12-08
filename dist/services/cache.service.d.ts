declare class CacheService {
    private generateHash;
    cacheUserData(userId: string, data: any, ttl?: number): Promise<void>;
    getUserData(userId: string): Promise<any>;
    cacheConversation(conversationId: string, data: any, ttl?: number): Promise<void>;
    getConversation(conversationId: string): Promise<any>;
    cacheAIResponse(query: string, mode: string, response: any, ttl?: number): Promise<void>;
    getAIResponse(query: string, mode: string): Promise<any>;
    cacheTranslation(text: string, sourceLang: string, targetLang: string, translation: string, ttl?: number): Promise<void>;
    getTranslation(text: string, sourceLang: string, targetLang: string): Promise<unknown>;
    invalidate(pattern: string): Promise<void>;
    clearUserCache(userId: string): Promise<void>;
    clearUserRateLimits(userId: string): Promise<void>;
    clearAllAICache(): Promise<{
        success: boolean;
        message: string;
    }>;
    flushAll(): Promise<{
        success: boolean;
        message: string;
    }>;
}
declare const _default: CacheService;
export default _default;
//# sourceMappingURL=cache.service.d.ts.map