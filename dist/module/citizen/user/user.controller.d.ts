import type { Response } from 'express';
import type { NextFunction } from 'express';
import type { AuthRequest } from "../../../middleware/auth.middleware.js";
declare class UserController {
    getProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    updateProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getUserStats(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    deleteUser(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
}
declare const _default: UserController;
export default _default;
//# sourceMappingURL=user.controller.d.ts.map