import type { Response, NextFunction } from 'express';
import type { LawyerAuthRequest } from '../../../middleware/auth.middleware.js';
declare class LawyerChatController {
    createConversation(req: LawyerAuthRequest, res: Response, next: NextFunction): Promise<void>;
    listConversations(req: LawyerAuthRequest, res: Response, next: NextFunction): Promise<void>;
    getConversation(req: LawyerAuthRequest, res: Response, next: NextFunction): Promise<void>;
    sendMessage(req: LawyerAuthRequest, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
    deleteConversation(req: LawyerAuthRequest, res: Response, next: NextFunction): Promise<void>;
}
declare const _default: LawyerChatController;
export default _default;
//# sourceMappingURL=lawyer-chat.controller.d.ts.map