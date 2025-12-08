import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../../config/database.js';
import { AppError } from '../../middleware/error.middleware.js';
import cacheService from '../../services/cache.service.js';
class AuthService {
    async register(email, password, name) {
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });
        if (existingUser) {
            throw new AppError('User already exists', 400);
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name,
                provider: 'LOCAL',
            },
            select: {
                id: true,
                email: true,
                name: true,
                avatar: true,
            },
        });
        const { accessToken, refreshToken } = this.generateTokens(user.id);
        await this.storeRefreshToken(user.id, refreshToken);
        return {
            user,
            accessToken,
            refreshToken,
        };
    }
    async login(email, password) {
        const user = await prisma.user.findUnique({
            where: { email },
        });
        if (!user || !user.password) {
            throw new AppError('Invalid credentials', 401);
        }
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            throw new AppError('Invalid credentials', 401);
        }
        await prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
        });
        const { accessToken, refreshToken } = this.generateTokens(user.id);
        await this.storeRefreshToken(user.id, refreshToken);
        return {
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                avatar: user.avatar,
            },
            accessToken,
            refreshToken,
        };
    }
    async refreshToken(refreshToken) {
        try {
            const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
            const storedToken = await prisma.refreshToken.findFirst({
                where: {
                    token: refreshToken,
                    userId: decoded.userId,
                    expiresAt: { gte: new Date() },
                },
            });
            if (!storedToken) {
                throw new AppError('Invalid refresh token', 401);
            }
            const { accessToken, refreshToken: newRefreshToken } = this.generateTokens(decoded.userId);
            await prisma.refreshToken.delete({
                where: { id: storedToken.id },
            });
            await this.storeRefreshToken(decoded.userId, newRefreshToken);
            return {
                accessToken,
                refreshToken: newRefreshToken,
            };
        }
        catch (error) {
            throw new AppError('Invalid refresh token', 401);
        }
    }
    async logout(userId, refreshToken) {
        await prisma.refreshToken.deleteMany({
            where: {
                userId,
                token: refreshToken,
            },
        });
        await cacheService.clearUserCache(userId);
        await cacheService.clearUserRateLimits(userId);
    }
    generateTokens(userId) {
        const accessToken = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '1d' });
        const refreshToken = jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' });
        return { accessToken, refreshToken };
    }
    async storeRefreshToken(userId, token) {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);
        await prisma.refreshToken.create({
            data: {
                userId,
                token,
                expiresAt,
            },
        });
    }
    async handleOAuthCallback(user) {
        await prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
        });
        const { accessToken, refreshToken } = this.generateTokens(user.id);
        await this.storeRefreshToken(user.id, refreshToken);
        return {
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                avatar: user.avatar,
            },
            accessToken,
            refreshToken,
        };
    }
}
export default new AuthService();
//# sourceMappingURL=auth.service.js.map