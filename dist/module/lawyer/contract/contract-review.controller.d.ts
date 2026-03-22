import type { Response, NextFunction } from 'express';
import type { LawyerAuthRequest } from '../../../middleware/auth.middleware.js';
interface LawyerAuthRequestWithFile extends LawyerAuthRequest {
    file?: Express.Multer.File;
}
declare class ContractReviewController {
    review(req: LawyerAuthRequestWithFile, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
}
declare const _default: ContractReviewController;
export default _default;
//# sourceMappingURL=contract-review.controller.d.ts.map