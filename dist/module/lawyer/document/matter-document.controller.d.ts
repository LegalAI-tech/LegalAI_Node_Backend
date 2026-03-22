import type { Response, NextFunction } from 'express';
import type { LawyerAuthRequest } from '../../../middleware/auth.middleware.js';
interface LawyerAuthRequestWithFile extends LawyerAuthRequest {
    file?: Express.Multer.File;
}
declare class MatterDocumentController {
    uploadDocument(req: LawyerAuthRequestWithFile, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
    listDocuments(req: LawyerAuthRequest, res: Response, next: NextFunction): Promise<void>;
    deleteDocument(req: LawyerAuthRequest, res: Response, next: NextFunction): Promise<void>;
}
declare const _default: MatterDocumentController;
export default _default;
//# sourceMappingURL=matter-document.controller.d.ts.map