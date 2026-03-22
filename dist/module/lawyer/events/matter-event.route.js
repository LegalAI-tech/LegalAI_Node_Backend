import { Router } from 'express';
import matterEventController from './matter-event.controller.js';
import { authenticateLawyer } from '../../../middleware/auth.middleware.js';
export const matterEventRouter = Router({ mergeParams: true });
matterEventRouter.use(authenticateLawyer);
matterEventRouter.post('/', matterEventController.createEvent);
matterEventRouter.get('/', matterEventController.listEvents);
matterEventRouter.get('/:eventId', matterEventController.getEvent);
matterEventRouter.patch('/:eventId', matterEventController.updateEvent);
matterEventRouter.post('/:eventId/complete', matterEventController.completeEvent);
matterEventRouter.delete('/:eventId', matterEventController.deleteEvent);
export const deadlineRouter = Router();
deadlineRouter.use(authenticateLawyer);
deadlineRouter.get('/', matterEventController.getUpcomingDeadlines);
//# sourceMappingURL=matter-event.route.js.map