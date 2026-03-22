import { Router } from 'express';
import workspaceMemoryController from './workspace-memory.controller.js';
import { authenticateLawyer } from '../../../middleware/auth.middleware.js';
const router = Router({ mergeParams: true });
router.use(authenticateLawyer);
router.get('/', workspaceMemoryController.getMemory);
router.patch('/', workspaceMemoryController.updateMemory);
router.post('/regenerate', workspaceMemoryController.regenerateMemory);
export default router;
//# sourceMappingURL=workspace.route.js.map