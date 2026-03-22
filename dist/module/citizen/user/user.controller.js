import userService from "./user.service.js";
class UserController {
    async getProfile(req, res, next) {
        try {
            const userId = req.user.id;
            const profile = await userService.getUserProfile(userId);
            res.status(200).json({
                success: true,
                data: profile,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async updateProfile(req, res, next) {
        try {
            const userId = req.user.id;
            const { name, avatar, preferences } = req.body;
            const updatedProfile = await userService.updateUserProfile(userId, {
                name,
                avatar,
                preferences,
            });
            res.status(200).json({
                success: true,
                data: updatedProfile,
                message: 'Profile updated successfully',
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getUserStats(req, res, next) {
        try {
            const userId = req.user.id;
            const stats = await userService.getUserStats(userId);
            res.status(200).json({
                success: true,
                data: stats,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async deleteUser(req, res, next) {
        try {
            const userId = req.user.id;
            const result = await userService.deleteUser(userId);
            res.status(200).json({
                success: true,
                message: result.message,
            });
        }
        catch (error) {
            next(error);
        }
    }
}
export default new UserController();
//# sourceMappingURL=user.controller.js.map