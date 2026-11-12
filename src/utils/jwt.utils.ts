import jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';
import { AppError } from '../middleware/error.middleware.js';

export type UserType = 'CITIZEN' | 'LAWYER' | 'FIRM_ADMIN' | 'FIRM_MEMBER';

export interface BaseJwtPayload {
  sub: string;               
  userType: UserType;
  iat?: number;
  exp?: number;
}

export interface CitizenJwtPayload extends BaseJwtPayload {
  userType: 'CITIZEN';
}

export interface LawyerJwtPayload extends BaseJwtPayload {
  userType: 'LAWYER';
  twoFactorVerified: boolean;
  verificationStatus: string;
}

export interface FirmJwtPayload extends BaseJwtPayload {
  userType: 'FIRM_ADMIN';
  twoFactorVerified: boolean;
  verificationStatus: string;
}


export interface TwoFaTempPayload {
  sub: string;
  userType: 'LAWYER' | 'FIRM_ADMIN';
  purpose: 'TWO_FA_PENDING';
  iat?: number;
  exp?: number;
}

const JWT_SECRET = () => {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET not set');
  return process.env.JWT_SECRET;
};

const JWT_REFRESH_SECRET = () => {
  if (!process.env.JWT_REFRESH_SECRET) throw new Error('JWT_REFRESH_SECRET not set');
  return process.env.JWT_REFRESH_SECRET;
};

const PYTHON_BACKEND_SECRETKEY = () => {
  if (!process.env.PYTHON_BACKEND_SECRETKEY) throw new Error('PYTHON_BACKEND_SECRETKEY not set');
  return process.env.PYTHON_BACKEND_SECRETKEY;
};

// Optional identity the Python service can use to scope a request.
export interface PythonServiceClaims {
  role?: UserType;
  tenant?: string;
  matter?: string;
}

/**
 * Short-lived token proving a request to the Python AI backend comes from this server.
 * Issuer and audience must match utils/auth.py in the Python backend.
 */
export function generatePythonServiceToken(claims: PythonServiceClaims = {}): string {
  return jwt.sign(claims, PYTHON_BACKEND_SECRETKEY(), {
    algorithm: 'HS256',
    subject: 'node-backend',
    issuer: 'legalai-node',
    audience: 'legalai-python',
    expiresIn: '5m',
  } as SignOptions);
}


export function generateCitizenTokens(citizenId: string) {
  const payload: CitizenJwtPayload = { sub: citizenId, userType: 'CITIZEN' };

  const accessToken = jwt.sign(payload, JWT_SECRET(), {
    expiresIn: '24h',
  } as SignOptions);

  const refreshToken = jwt.sign(
    { sub: citizenId, userType: 'CITIZEN' },
    JWT_REFRESH_SECRET(),
    { expiresIn: '30d' } as SignOptions
  );

  return { accessToken, refreshToken };
}

export function generateLawyerTokens(
  lawyerId: string,
  verificationStatus: string
) {
  const payload: LawyerJwtPayload = {
    sub: lawyerId,
    userType: 'LAWYER',
    twoFactorVerified: true,
    verificationStatus,
  };

  const accessToken = jwt.sign(payload, JWT_SECRET(), {
    expiresIn: '12h',
  } as SignOptions);

  const refreshToken = jwt.sign(
    { sub: lawyerId, userType: 'LAWYER' },
    JWT_REFRESH_SECRET(),
    { expiresIn: '7d' } as SignOptions
  );

  return { accessToken, refreshToken };
}

export function generateFirmTokens(
  firmId: string,
  verificationStatus: string
) {
  const payload: FirmJwtPayload = {
    sub: firmId,
    userType: 'FIRM_ADMIN',
    twoFactorVerified: true,
    verificationStatus,
  };

  const accessToken = jwt.sign(payload, JWT_SECRET(), {
    expiresIn: '4h',
  } as SignOptions);

  const refreshToken = jwt.sign(
    { sub: firmId, userType: 'FIRM_ADMIN' },
    JWT_REFRESH_SECRET(),
    { expiresIn: '1d' } as SignOptions
  );

  return { accessToken, refreshToken };
}


export function generateTwoFaTempToken(
  userId: string,
  userType: 'LAWYER' | 'FIRM_ADMIN'
): string {
  const payload: TwoFaTempPayload = {
    sub: userId,
    userType,
    purpose: 'TWO_FA_PENDING',
  };

  return jwt.sign(payload, JWT_SECRET(), { expiresIn: '10m' } as SignOptions);
}

export function verifyTwoFaTempToken(token: string): TwoFaTempPayload {
  try {
    const decoded = jwt.verify(token, JWT_SECRET()) as TwoFaTempPayload;

    if (decoded.purpose !== 'TWO_FA_PENDING') {
      throw new AppError('Invalid 2FA token', 401, 'INVALID_2FA_TOKEN');
    }

    return decoded;
  } catch (error: any) {
    if (error instanceof AppError) throw error;

    if (error.name === 'TokenExpiredError') {
      throw new AppError(
        'Verification session expired. Please login again.',
        401,
        'TWO_FA_TOKEN_EXPIRED'
      );
    }

    throw new AppError('Invalid 2FA token', 401, 'INVALID_2FA_TOKEN');
  }
}


export function verifyRefreshToken(token: string): BaseJwtPayload {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET()) as BaseJwtPayload;
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      throw new AppError('Refresh token expired. Please login again.', 401, 'REFRESH_EXPIRED');
    }
    throw new AppError('Invalid refresh token', 401, 'INVALID_REFRESH');
  }
}


export function verifyAccessToken(token: string): BaseJwtPayload {
  try {
    return jwt.verify(token, JWT_SECRET()) as BaseJwtPayload;
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      throw new AppError('Token expired. Please refresh.', 401, 'TOKEN_EXPIRED');
    }
    throw new AppError('Invalid token', 401, 'INVALID_TOKEN');
  }
}