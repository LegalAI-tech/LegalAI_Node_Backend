import { Router } from 'express';
import type { RequestHandler } from 'express';
import matterController from './matter.controller.js';
import { authenticateLawyer } from '../../../middleware/auth.middleware.js';

const router = Router();

router.use(authenticateLawyer as RequestHandler);

router.post('/', matterController.createMatter as RequestHandler);
router.get('/', matterController.listMatters as RequestHandler);
router.get('/:matterId', matterController.getMatter as RequestHandler);
router.patch('/:matterId', matterController.updateMatter as RequestHandler);
router.delete('/:matterId', matterController.archiveMatter as RequestHandler);  

export default router;