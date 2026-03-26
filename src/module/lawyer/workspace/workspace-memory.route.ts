import { Router } from 'express';
import type { RequestHandler } from 'express';
import workspaceMemoryController from './workspace-memory.controller.js';
import { authenticateLawyer } from '../../../middleware/auth.middleware.js';

const router = Router({ mergeParams: true });

router.use(authenticateLawyer as RequestHandler);

router.get('/', workspaceMemoryController.getMemory as RequestHandler);
router.patch('/', workspaceMemoryController.updateMemory as RequestHandler);
router.post('/regenerate', workspaceMemoryController.regenerateMemory as RequestHandler);

export default router;