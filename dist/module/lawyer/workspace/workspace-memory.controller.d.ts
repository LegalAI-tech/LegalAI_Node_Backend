import type { Response, NextFunction } from 'express';
import type { LawyerAuthRequest } from '../../../middleware/auth.middleware.js';
declare class WorkspaceMemoryController {
    getMemory(req: LawyerAuthRequest, res: Response, next: NextFunction): Promise<void>;
    updateMemory(req: LawyerAuthRequest, res: Response, next: NextFunction): Promise<void>;
    regenerateMemory(req: LawyerAuthRequest, res: Response, next: NextFunction): Promise<void>;
}
declare const _default: WorkspaceMemoryController;
export default _default;
//# sourceMappingURL=workspace-memory.controller.d.ts.map