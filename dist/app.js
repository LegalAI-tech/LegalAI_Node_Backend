import express from 'express';
import compression from 'compression';
import passport from './config/passport.js';
import { errorHandler } from './middleware/error.middleware.js';
import { corsMiddleware } from './middleware/cors.middleware.js';
import rateLimit from 'express-rate-limit';
// Import routes
import authRoutes from './module/auth/citizen/auth.route.js';
import lawyerAuthRoutes from './module/auth/lawyer/lawyerauth.route.js';
import firmAuthRoutes from './module/auth/firms/firmauth.route.js';
import chatRoutes from './module/citizen/chat/chat.route.js';
import documentRoutes from './module/document/document.route.js';
import translationRoutes from './module/translation/translation.route.js';
import userRoutes from './module/citizen/user/user.route.js';
import lawyerChatRoutes from './module/lawyer/chat/lawyer-chat.route.js';
import clientCommsRoutes from './module/lawyer/comms/client-comms.route.js';
import contractReviewRoutes from './module/lawyer/contract/contract-review.route.js';
import { deadlineRouter } from './module/lawyer/events/matter-event.route.js';
import matterRoutes from './module/lawyer/matter/matter.route.js';
const app = express();
// Trust proxy for Render deployment
app.set('trust proxy', 1);
app.use(corsMiddleware);
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
// Citizen endpoints
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/translation', translationRoutes);
app.use('/api/user', userRoutes);
// Lawyer endpoints
app.use('/api/lawyer/auth', lawyerAuthRoutes);
app.use('/api/lawyer/chat', lawyerChatRoutes);
app.use('/api/lawyer/comms', clientCommsRoutes);
app.use('/api/lawyer/contract', contractReviewRoutes);
app.use('/api/lawyer/deadlines', deadlineRouter);
app.use('/api/lawyer/matter', matterRoutes);
// Firm endpoints
app.use('/api/firm/auth', firmAuthRoutes);
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