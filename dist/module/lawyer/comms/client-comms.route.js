import { Router } from 'express';
import clientCommsController from './client-comms.controller.js';
import { authenticateLawyer } from '../../../middleware/auth.middleware.js';
const router = Router();
router.use(authenticateLawyer);
router.post('/generate', clientCommsController.generate);
export default router;
//# sourceMappingURL=client-comms.route.js.map