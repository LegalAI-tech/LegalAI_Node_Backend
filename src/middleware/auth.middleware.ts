import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';

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


function extractBearerToken(req: Request, res: Response): string | null {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({ success: false, message: 'Authorization header required.', code: 'NO_TOKEN' });
    return null;
  }

  if (!authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: 'Use: Bearer <token>', code: 'INVALID_FORMAT' });
    return null;
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    res.status(401).json({ success: false, message: 'Token is empty.', code: 'MISSING_TOKEN' });
    return null;
  }

  return token;
}

function verifyJwt(token: string, res: Response): any | null {
  try {
    return jwt.verify(token, process.env.JWT_SECRET!);
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      res.status(401).json({ success: false, message: 'Token expired. Please refresh.', code: 'TOKEN_EXPIRED' });
    } else {
      res.status(401).json({ success: false, message: 'Invalid token.', code: 'INVALID_TOKEN' });
    }
    return null;
  }
}


export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const token = extractBearerToken(req, res);
  if (!token) return;

  const decoded = verifyJwt(token, res);
  if (!decoded) return;

  if (decoded.userType !== 'CITIZEN') {
    res.status(403).json({ success: false, message: 'This route is for citizen accounts only.', code: 'WRONG_USER_TYPE' });
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      select: { id: true, email: true, name: true, avatar: true, provider: true },
    });

    if (!user) {
      res.status(401).json({ success: false, message: 'Account not found.', code: 'USER_NOT_FOUND' });
      return;
    }

    (req as AuthRequest).user = user;
    next();
  } catch (error) {
    logger.error('Citizen auth middleware error', error);
    res.status(500).json({ success: false, message: 'Authentication error.', code: 'AUTH_ERROR' });
  }
};


export const authenticateLawyer = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const token = extractBearerToken(req, res);
  if (!token) return;

  const decoded = verifyJwt(token, res);
  if (!decoded) return;

  if (decoded.userType !== 'LAWYER') {
    res.status(403).json({ success: false, message: 'This route requires a lawyer account.', code: 'WRONG_USER_TYPE' });
    return;
  }

  if (!decoded.twoFactorVerified) {
    res.status(401).json({ success: false, message: '2FA verification required.', code: 'TWO_FA_REQUIRED' });
    return;
  }

  try {
    const lawyer = await prisma.lawyerUser.findUnique({
      where: { id: decoded.sub },
      select: {
        id: true, email: true, name: true,
        verificationStatus: true, isLocked: true,
        barCouncilState: true, practiceAreas: true,
      },
    });

    if (!lawyer) {
      res.status(401).json({ success: false, message: 'Lawyer account not found.', code: 'USER_NOT_FOUND' });
      return;
    }

    if (lawyer.isLocked) {
      res.status(403).json({ success: false, message: 'Account is locked. Please contact support.', code: 'ACCOUNT_LOCKED' });
      return;
    }

    (req as LawyerAuthRequest).lawyer = {
      id: lawyer.id,
      email: lawyer.email,
      name: lawyer.name,
      userType: 'LAWYER',
      verificationStatus: lawyer.verificationStatus,
      twoFactorVerified: true,
      barCouncilState: lawyer.barCouncilState,
      practiceAreas: lawyer.practiceAreas,
    };

    next();
  } catch (error) {
    logger.error('Lawyer auth middleware error', error);
    res.status(500).json({ success: false, message: 'Authentication error.', code: 'AUTH_ERROR' });
  }
};


export const authenticateFirm = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const token = extractBearerToken(req, res);
  if (!token) return;

  const decoded = verifyJwt(token, res);
  if (!decoded) return;

  if (decoded.userType !== 'FIRM_ADMIN') {
    res.status(403).json({ success: false, message: 'This route requires a firm admin account.', code: 'WRONG_USER_TYPE' });
    return;
  }

  if (!decoded.twoFactorVerified) {
    res.status(401).json({ success: false, message: '2FA verification required.', code: 'TWO_FA_REQUIRED' });
    return;
  }

  try {
    const firm = await prisma.firmUser.findUnique({
      where: { id: decoded.sub },
      select: {
        id: true, email: true, name: true, firmName: true,
        verificationStatus: true, isLocked: true,
        city: true, state: true,
      },
    });

    if (!firm) {
      res.status(401).json({ success: false, message: 'Firm account not found.', code: 'USER_NOT_FOUND' });
      return;
    }

    if (firm.isLocked) {
      res.status(403).json({ success: false, message: 'Firm account is locked.', code: 'ACCOUNT_LOCKED' });
      return;
    }

    (req as FirmAuthRequest).firm = {
      id: firm.id,
      email: firm.email,
      name: firm.name,
      firmName: firm.firmName,
      userType: 'FIRM_ADMIN',
      verificationStatus: firm.verificationStatus,
      twoFactorVerified: true,
      city: firm.city,
      state: firm.state,
    };

    next();
  } catch (error) {
    logger.error('Firm auth middleware error', error);
    res.status(500).json({ success: false, message: 'Authentication error.', code: 'AUTH_ERROR' });
  }
};


export const authenticateAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const token = extractBearerToken(req, res);
  if (!token) return;

  const decoded = verifyJwt(token, res);
  if (!decoded) return;

  if (decoded.userType !== 'ADMIN') {
    res.status(403).json({ success: false, message: 'Admin access required.', code: 'NOT_ADMIN' });
    return;
  }

  next();
};


export const authenticateLawyerOrFirm = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const token = extractBearerToken(req, res);
  if (!token) return;

  const decoded = verifyJwt(token, res);
  if (!decoded) return;

  if (decoded.userType === 'LAWYER') {
    return authenticateLawyer(req, res, next);
  }

  if (decoded.userType === 'FIRM_ADMIN') {
    return authenticateFirm(req, res, next);
  }

  res.status(403).json({
    success: false,
    message: 'This route requires a lawyer or firm account.',
    code: 'WRONG_USER_TYPE',
  });
};

// Add this to the very bottom of auth.middleware.ts
export const authenticateUniversal = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const token = extractBearerToken(req, res);
  if (!token) return;

  const decoded = verifyJwt(token, res);
  if (!decoded) return;

  try {
    if (decoded.userType === 'CITIZEN') {
      const user = await prisma.user.findUnique({
        where: { id: decoded.sub },
        select: { id: true, email: true, name: true, avatar: true, provider: true },
      });
      if (user) {
        (req as AuthRequest).user = user;
        return next();
      }
    }

    if (decoded.userType === 'LAWYER') {
      const lawyer = await prisma.lawyerUser.findUnique({
        where: { id: decoded.sub }
      });
      if (lawyer) {
        (req as AuthRequest).user = {
          id: lawyer.id,
          email: lawyer.email,
          name: lawyer.name,
          avatar: null,
          provider: 'lawyer',
        };
        return next();
      }
    }

    if (decoded.userType === 'FIRM_ADMIN') {
      const firm = await prisma.firmUser.findUnique({
        where: { id: decoded.sub }
      });
      if (firm) {
        (req as AuthRequest).user = {
          id: firm.id,
          email: firm.email,
          name: firm.name,
          avatar: null,
          provider: 'firm',
        };
        return next();
      }
    }

    res.status(401).json({ success: false, message: 'Account not found.', code: 'USER_NOT_FOUND' });
  } catch (error) {
    logger.error('Universal auth middleware error', error);
    res.status(500).json({ success: false, message: 'Authentication error.', code: 'AUTH_ERROR' });
  }
};
