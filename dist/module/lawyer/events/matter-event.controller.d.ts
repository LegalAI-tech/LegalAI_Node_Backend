import type { Response, NextFunction } from 'express';
import type { LawyerAuthRequest } from '../../../middleware/auth.middleware.js';
declare class MatterEventController {
    createEvent(req: LawyerAuthRequest, res: Response, next: NextFunction): Promise<void>;
    listEvents(req: LawyerAuthRequest, res: Response, next: NextFunction): Promise<void>;
    getEvent(req: LawyerAuthRequest, res: Response, next: NextFunction): Promise<void>;
    updateEvent(req: LawyerAuthRequest, res: Response, next: NextFunction): Promise<void>;
    completeEvent(req: LawyerAuthRequest, res: Response, next: NextFunction): Promise<void>;
    deleteEvent(req: LawyerAuthRequest, res: Response, next: NextFunction): Promise<void>;
    getUpcomingDeadlines(req: LawyerAuthRequest, res: Response, next: NextFunction): Promise<void>;
}
declare const _default: MatterEventController;
export default _default;
//# sourceMappingURL=matter-event.controller.d.ts.map