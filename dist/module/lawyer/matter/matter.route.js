import { Router } from 'express';
import matterController from './matter.controller.js';
import { authenticateLawyer } from '../../../middleware/auth.middleware.js';
const router = Router();
router.use(authenticateLawyer);
router.post('/', matterController.createMatter);
router.get('/', matterController.listMatters);
router.get('/:matterId', matterController.getMatter);
router.patch('/:matterId', matterController.updateMatter);
router.delete('/:matterId', matterController.archiveMatter);
export default router;
//# sourceMappingURL=matter.route.js.map