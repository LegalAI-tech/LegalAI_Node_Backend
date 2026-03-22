import { Router } from 'express';
import userController from './user.controller.js';
import { authenticate, type AuthRequest } from '../../../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/profile', (req, res, next) => userController.getProfile(req as AuthRequest, res, next));
router.put('/profile', (req, res, next) => userController.updateProfile(req as AuthRequest, res, next));
router.get('/stats', (req, res, next) => userController.getUserStats(req as AuthRequest, res, next));
router.delete('/profile', (req, res, next) => userController.deleteUser(req as AuthRequest, res, next));

export default router;