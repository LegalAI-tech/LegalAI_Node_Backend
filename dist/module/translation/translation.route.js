import { Router } from 'express';
import translationController from './translation.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
const router = Router();
router.use(authenticate);
router.post('/translate', (req, res, next) => translationController.translate(req, res, next));
router.post('/detect-language', (req, res, next) => translationController.detectLanguage(req, res, next));
router.get('/history', (req, res, next) => translationController.getUserTranslations(req, res, next));
export default router;
//# sourceMappingURL=translation.route.js.map