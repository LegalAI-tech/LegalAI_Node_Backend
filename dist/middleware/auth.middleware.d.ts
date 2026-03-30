import type { Request, Response, NextFunction } from 'express';
export interface AuthRequest extends Request {
    user?: {
        id: string;
        email: string;
        name: string | null;
        avatar: string | null;
        provider: string;
    };
}
export interface LawyerAuthRequest extends Request {
    lawyer?: {
        id: string;
        email: string;
        name: string;
        userType: 'LAWYER';
        verificationStatus: string;
        twoFactorVerified: boolean;
        barCouncilState: string;
        practiceAreas: string[];
    };
}
export interface FirmAuthRequest extends Request {
    firm?: {
        id: string;
        email: string;
        name: string;
        firmName: string;
        userType: 'FIRM_ADMIN';
        verificationStatus: string;
        twoFactorVerified: boolean;
        city: string;
        state: string;
    };
}
export declare const authenticate: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const authenticateLawyer: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const authenticateFirm: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const authenticateAdmin: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const authenticateLawyerOrFirm: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const authenticateUniversal: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=auth.middleware.d.ts.map