import app from './app.js';
import { logger } from './utils/logger.js';
import prisma from './config/database.js';
import { execSync } from 'child_process';
const PORT = process.env.PORT || 10000;
async function startServer() {
    try {
        if (process.env.NODE_ENV === 'production') {
            try {
                logger.info('Running database migrations...');
                execSync('npx prisma migrate deploy', { stdio: 'inherit' });
                logger.info('Migrations completed');
            }
            catch (error) {
                logger.warn('Migration warning:', error);
            }
        }
        await prisma.$connect();
        logger.info('Database connected');
        const server = app.listen(PORT, () => {
            logger.info(`Server running on port ${PORT}`);
            logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
            logger.info(`Frontend URL: ${process.env.FRONTEND_URL}`);
        });
        let isShuttingDown = false;
        const gracefulShutdown = async (signal) => {
            if (isShuttingDown) {
                return;
            }
            isShuttingDown = true;
            logger.info(`${signal} signal received: closing HTTP server`);
            server.close(async () => {
                logger.info('HTTP server closed');
                await prisma.$disconnect();
                process.exit(0);
            });
        };
        process.on('SIGTERM', async () => {
            await gracefulShutdown('SIGTERM');
        });
        process.on('SIGINT', async () => {
            await gracefulShutdown('SIGINT');
        });
    }
    catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
}
startServer();
//# sourceMappingURL=server.js.map