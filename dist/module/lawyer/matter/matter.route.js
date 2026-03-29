import { Router } from 'express';
import matterController from './matter.controller.js';
import { authenticateLawyer } from '../../../middleware/auth.middleware.js';
import matterDocumentRoutes from '../document/matter-document.route.js';
import { matterEventRouter } from '../events/matter-event.route.js';
import workspaceMemoryRoutes from '../workspace/workspace-memory.route.js';
const router = Router();
router.use(authenticateLawyer);
router.post('/', matterController.createMatter);
router.get('/', matterController.listMatters);
router.get('/:matterId', matterController.getMatter);
router.patch('/:matterId', matterController.updateMatter);
router.delete('/:matterId', matterController.archiveMatter);
// Nested routes relying on req.params.matterId
router.use('/:matterId/documents', matterDocumentRoutes);
router.use('/:matterId/events', matterEventRouter);
router.use('/:matterId/memory', workspaceMemoryRoutes);
export default router;
//# sourceMappingURL=matter.route.js.map