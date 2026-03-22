import { Router } from 'express';
import type { RequestHandler } from 'express';
import matterEventController from './matter-event.controller.js';
import { authenticateLawyer } from '../../../middleware/auth.middleware.js';

export const matterEventRouter = Router({ mergeParams: true });

matterEventRouter.use(authenticateLawyer as RequestHandler);

matterEventRouter.post('/', matterEventController.createEvent as RequestHandler);
matterEventRouter.get('/', matterEventController.listEvents as RequestHandler);
matterEventRouter.get('/:eventId', matterEventController.getEvent as RequestHandler);
matterEventRouter.patch('/:eventId', matterEventController.updateEvent as RequestHandler);
matterEventRouter.post('/:eventId/complete', matterEventController.completeEvent as RequestHandler);
matterEventRouter.delete('/:eventId', matterEventController.deleteEvent as RequestHandler);

export const deadlineRouter = Router();

deadlineRouter.use(authenticateLawyer as RequestHandler);

deadlineRouter.get('/', matterEventController.getUpcomingDeadlines as RequestHandler);