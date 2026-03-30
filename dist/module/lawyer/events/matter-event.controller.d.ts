import type { Response, NextFunction } from 'express';
import type { LawyerAuthRequest } from '../../../middleware/auth.middleware.js';
declare class MatterEventController {
    createEvent(req: LawyerAuthRequest, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
    listEvents(req: LawyerAuthRequest, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
    getEvent(req: LawyerAuthRequest, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
    updateEvent(req: LawyerAuthRequest, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
    completeEvent(req: LawyerAuthRequest, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
    deleteEvent(req: LawyerAuthRequest, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
    getUpcomingDeadlines(req: LawyerAuthRequest, res: Response, next: NextFunction): Promise<void>;
}
declare const _default: MatterEventController;
export default _default;
//# sourceMappingURL=matter-event.controller.d.ts.map