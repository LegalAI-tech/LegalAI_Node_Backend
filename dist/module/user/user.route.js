import { Router } from 'express';
import userController from './user.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
const router = Router();
router.use(authenticate);
router.get('/profile', (req, res, next) => userController.getProfile(req, res, next));
router.put('/profile', (req, res, next) => userController.updateProfile(req, res, next));
router.get('/stats', (req, res, next) => userController.getUserStats(req, res, next));
router.delete('/profile', (req, res, next) => userController.deleteUser(req, res, next));
export default router;
//# sourceMappingURL=user.route.js.map