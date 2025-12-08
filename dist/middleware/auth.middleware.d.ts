import { Request, Response, NextFunction } from 'express';
export interface AuthRequest extends Request {
    user: {
        id: string;
        email: string;
        name: string | null;
        avatar: string | null;
        provider: string;
    };
}
export interface OptionalAuthRequest extends Request {
    user?: {
        id: string;
        email: string;
        name: string | null;
        avatar: string | null;
        provider: string;
    };
}
export declare const authenticate: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const optionalAuth: (req: OptionalAuthRequest, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=auth.middleware.d.ts.map