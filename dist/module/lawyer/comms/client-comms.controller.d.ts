import type { Response, NextFunction } from 'express';
import type { LawyerAuthRequest } from '../../../middleware/auth.middleware.js';
declare class ClientCommsController {
    generate(req: LawyerAuthRequest, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
}
declare const _default: ClientCommsController;
export default _default;
//# sourceMappingURL=client-comms.controller.d.ts.map