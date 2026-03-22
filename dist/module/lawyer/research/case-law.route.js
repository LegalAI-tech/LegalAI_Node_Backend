import { Router } from 'express';
import caseLawController from './case-law.controller.js';
import { authenticateLawyer } from '../../../middleware/auth.middleware.js';
const router = Router();
router.use(authenticateLawyer);
router.post('/', caseLawController.search);
router.post('/save', caseLawController.saveSelected);
export default router;
//# sourceMappingURL=case-law.route.js.map