import { Router } from 'express';
import type { RequestHandler } from 'express';
import matterController from './matter.controller.js';
import { authenticateLawyer } from '../../../middleware/auth.middleware.js';
import matterDocumentRoutes from '../document/matter-document.route.js';
import { matterEventRouter } from '../events/matter-event.route.js';
import workspaceMemoryRoutes from '../workspace/workspace-memory.route.js';


const router = Router();

router.use(authenticateLawyer as RequestHandler);

router.post('/', matterController.createMatter as RequestHandler);
router.get('/', matterController.listMatters as RequestHandler);
router.get('/:matterId', matterController.getMatter as RequestHandler);
router.patch('/:matterId', matterController.updateMatter as RequestHandler);
router.delete('/:matterId', matterController.archiveMatter as RequestHandler);  

// Nested routes relying on req.params.matterId
router.use('/:matterId/documents', matterDocumentRoutes);
router.use('/:matterId/events', matterEventRouter);
router.use('/:matterId/memory', workspaceMemoryRoutes);


export default router;