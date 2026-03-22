import type { Response, NextFunction } from 'express';
import type { LawyerAuthRequest } from '../../../middleware/auth.middleware.js';
declare class MatterController {
    createMatter(req: LawyerAuthRequest, res: Response, next: NextFunction): Promise<void>;
    listMatters(req: LawyerAuthRequest, res: Response, next: NextFunction): Promise<void>;
    getMatter(req: LawyerAuthRequest, res: Response, next: NextFunction): Promise<void>;
    updateMatter(req: LawyerAuthRequest, res: Response, next: NextFunction): Promise<void>;
    archiveMatter(req: LawyerAuthRequest, res: Response, next: NextFunction): Promise<void>;
}
declare const _default: MatterController;
export default _default;
//# sourceMappingURL=matter.controller.d.ts.map