import type { Response } from 'express';
import type { NextFunction } from 'express';
import type { AuthRequest } from '../../middleware/auth.middleware.js';
interface AuthRequestWithFile extends AuthRequest {
    file?: Express.Multer.File;
}
declare class ChatController {
    createConversation(req: AuthRequest, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
    sendMessage(req: AuthRequestWithFile, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
    getConversations(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getConversationMessages(req: AuthRequest, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
    getConversationInfo(req: AuthRequest, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
    deleteConversation(req: AuthRequest, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
    deleteAllConversations(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    shareConversation(req: AuthRequest, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
    getSharedConversation(req: AuthRequest | any, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
}
declare const _default: ChatController;
export default _default;
//# sourceMappingURL=chat.controller.d.ts.map