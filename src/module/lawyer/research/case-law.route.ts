import { Router } from 'express';
import type { RequestHandler } from 'express';
import caseLawController from './case-law.controller.js';
import { authenticateLawyer } from '../../../middleware/auth.middleware.js';

const router = Router();
router.use(authenticateLawyer as RequestHandler);

router.post('/', caseLawController.search as RequestHandler);

router.post('/save', caseLawController.saveSelected as RequestHandler);

export default router;