import { Router } from 'express';
import type { RequestHandler } from 'express';
import clientCommsController from './client-comms.controller.js';
import { authenticateLawyer } from '../../../middleware/auth.middleware.js';

const router = Router();

router.use(authenticateLawyer as RequestHandler);

router.post('/generate', clientCommsController.generate as RequestHandler);

export default router;