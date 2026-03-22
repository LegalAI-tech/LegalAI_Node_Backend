import type { Response, NextFunction } from 'express';
import type { LawyerAuthRequest } from '../../../middleware/auth.middleware.js';
declare class CaseLawController {
    search(req: LawyerAuthRequest, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
    saveSelected(req: LawyerAuthRequest, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
}
declare const _default: CaseLawController;
export default _default;
//# sourceMappingURL=case-law.controller.d.ts.map