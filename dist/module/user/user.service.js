import prisma from "../../config/database.js";
import cacheService from "../../services/cache.service.js";
import { AppError } from "../../middleware/error.middleware.js";
class UserService {
    async getUserProfile(userId) {
        const cached = await cacheService.getUserData(userId);
        if (cached)
            return cached;
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                name: true,
                avatar: true,
                provider: true,
                preferences: true,
                createdAt: true,
                lastLoginAt: true,
            },
        });
        if (!user) {
            throw new AppError('User not found', 404);
        }
        await cacheService.cacheUserData(userId, user, 3600);
        return user;
    }
    async updateUserProfile(userId, data) {
        const user = await prisma.user.update({
            where: { id: userId },
            data,
            select: {
                id: true,
                email: true,
                name: true,
                avatar: true,
                preferences: true,
            },
        });
        await cacheService.clearUserCache(userId);
        return user;
    }
    async getUserStats(userId) {
        const [conversationCount, documentCount, translationCount] = await Promise.all([
            prisma.conversation.count({ where: { userId } }),
            prisma.document.count({ where: { userId } }),
            prisma.translation.count({ where: { userId } }),
        ]);
        return {
            conversations: conversationCount,
            documents: documentCount,
            translations: translationCount,
        };
    }
    async deleteUser(userId) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            throw new AppError('User not found', 404);
        }
        await prisma.$transaction(async (tx) => {
            await tx.conversation.deleteMany({ where: { userId } });
            await tx.document.deleteMany({ where: { userId } });
            await tx.translation.deleteMany({ where: { userId } });
            await tx.user.delete({ where: { id: userId } });
        });
        await cacheService.clearUserCache(userId);
        return { message: 'User deleted successfully' };
    }
}
export default new UserService();
//# sourceMappingURL=user.service.js.map