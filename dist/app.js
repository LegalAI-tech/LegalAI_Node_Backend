import express from 'express';
import compression from 'compression';
import passport from './config/passport.js';
import { errorHandler } from './middleware/error.middleware.js';
import { corsMiddleware } from './middleware/cors.middleware.js';
import rateLimit from 'express-rate-limit';
// Import routes
import authRoutes from './module/auth/auth.route.js';
import chatRoutes from './module/chat/chat.route.js';
import documentRoutes from './module/document/document.route.js';
import translationRoutes from './module/translation/translation.route.js';
import userRoutes from './module/user/user.route.js';
const app = express();
// Trust proxy for Render deployment
app.set('trust proxy', 1);
app.use(corsMiddleware);
app.options('*', corsMiddleware);
// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
// Compression
app.use(compression());
// Passport initialization
app.use(passport.initialize());
// Rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api', limiter);
// Health check
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
});
// API routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/translation', translationRoutes);
app.use('/api/user', userRoutes);
// 404 handler - catch all unmatched routes
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found',
    });
});
app.use(errorHandler);
export default app;
//# sourceMappingURL=app.js.map