import rateLimit from 'express-rate-limit';
import redis from '../config/redis.js';
export const apiLimiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
    message: {
        success: false,
        message: 'Too many requests from this IP, please try again later.',
        code: 'RATE_LIMIT_EXCEEDED',
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        const retryAfter = req.rateLimit?.resetTime
            ? Math.ceil((req.rateLimit.resetTime.getTime() - Date.now()) / 1000)
            : 900;
        res.status(429).json({
            success: false,
            message: 'Too many requests. Please try again later.',
            code: 'RATE_LIMIT_EXCEEDED',
            retryAfter,
        });
    },
});
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    skipSuccessfulRequests: false,
    message: {
        success: false,
        message: 'Too many authentication attempts. Please try again later.',
        code: 'AUTH_RATE_LIMIT_EXCEEDED',
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(429).json({
            success: false,
            message: 'Too many login attempts. Please try again in 15 minutes.',
            code: 'AUTH_RATE_LIMIT_EXCEEDED',
        });
    },
});
export const uploadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 10,
    skipFailedRequests: true,
    message: {
        success: false,
        message: 'Upload limit exceeded. Maximum 10 uploads per hour.',
        code: 'UPLOAD_RATE_LIMIT_EXCEEDED',
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        return req.user?.id || req.ip || 'unknown';
    },
    handler: (req, res) => {
        res.status(429).json({
            success: false,
            message: 'Too many uploads. Maximum 10 per hour.',
            code: 'UPLOAD_RATE_LIMIT_EXCEEDED',
        });
    },
});
export const messageLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    skipFailedRequests: true,
    message: {
        success: false,
        message: 'Too many messages. Please slow down.',
        code: 'MESSAGE_RATE_LIMIT_EXCEEDED',
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        return req.user?.id || req.ip || 'unknown';
    },
    handler: (req, res) => {
        res.status(429).json({
            success: false,
            message: 'Sending messages too quickly. Please wait a moment.',
            code: 'MESSAGE_RATE_LIMIT_EXCEEDED',
        });
    },
});
function formatUserKey(userId, limiterName) {
    return `ratelimit:user:${userId}:${limiterName}`;
}
function persistentUserLimiter(limiterName, max) {
    return async (req, res, next) => {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return next();
            }
            const key = formatUserKey(userId, limiterName);
            const current = await redis.incr(key);
            if (current === 1) {
            }
            if (current > max) {
                return res.status(429).json({
                    success: false,
                    message: 'Too many requests. Rate limit exceeded for this session. You will be allowed again after logout.',
                    code: 'RATE_LIMIT_EXCEEDED',
                });
            }
            req.rateLimit = { limit: max, current, remaining: Math.max(0, max - current) };
            return next();
        }
        catch (error) {
            console.error('Persistent rate limiter error:', error);
            return next();
        }
    };
}
export const persistentMessageLimiter = persistentUserLimiter('message', 20);
export const persistentUploadLimiter = persistentUserLimiter('upload', 10);
export const persistentApiLimiter = persistentUserLimiter('api', parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'));
//# sourceMappingURL=rateLimiter.middleware.js.map