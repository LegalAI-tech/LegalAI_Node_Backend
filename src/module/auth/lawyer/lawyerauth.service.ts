import bcrypt from 'bcryptjs';
import prisma from '../../../config/database.js';
import { AppError } from '../../../middleware/error.middleware.js';
import { logger } from '../../../utils/logger.js';
import encryptionService from '../../../services/encryption.service.js';
import otpService from '../../../services/otp.service.js';
import notificationService from '../../../services/notification.service.js';
import cacheService from '../../../services/cache.service.js';
import {
  validateLawyerRegistration,
  validatePasswordStrength
} from '../../../utils/validator.js';
import {
  generateLawyerTokens,
  generateTwoFaTempToken,
  verifyTwoFaTempToken,
  verifyRefreshToken,
} from '../../../utils/jwt.utils.js';


class LawyerAuthService {

  async register(input: {
    email: string;
    password: string;
    name: string;
    phone: string;
    barNumber: string;
    barCouncilState: string;
    practiceAreas?: string[];
    yearsOfExperience?: number;
  }) {
    const {
      email, password, name, phone,
      barNumber, barCouncilState,
      practiceAreas = [], yearsOfExperience,
    } = input;

    const validationErrors = validateLawyerRegistration({
      email, password, name, phone, barNumber, barCouncilState,
    });

    const existing = await prisma.lawyerUser.findUnique({ where: { email } });
    if (existing) {
      throw new AppError('An account with this email already exists.', 409, 'EMAIL_EXISTS');
    }

    const allFormatsPassed = validationErrors.length === 0;
    const verificationStatus = allFormatsPassed ? 'AUTO_VERIFIED' : 'FORMAT_FAILED';

    const hashedPassword = await bcrypt.hash(password, 12);
    const encryptedPhone = encryptionService.encrypt(phone.replace(/\s|-/g, ''));
    const encryptedBarNumber = encryptionService.encrypt(barNumber.trim().toUpperCase());

    const lawyer = await prisma.$transaction(async (tx) => {
      const created = await tx.lawyerUser.create({
        data: {
          email,
          name,
          password: hashedPassword,
          provider: 'LOCAL',
          encryptedPhone,
          encryptedBarNumber,
          barCouncilState: barCouncilState.toUpperCase().replace(/\s+/g, '_'),
          practiceAreas,
          yearsOfExperience,
          phoneVerified: false,
          emailVerified: false,
          barNumberFormatValid: allFormatsPassed,
          verificationStatus,
          verifiedAt: allFormatsPassed ? new Date() : null,
          validationErrors: validationErrors.length > 0
            ? (validationErrors as any)
            : undefined,
        },
        select: {
          id: true, email: true, name: true,
          verificationStatus: true, barCouncilState: true,
        },
      });

      await tx.lawyerTwoFactorAuth.create({
        data: {
          lawyerId: created.id,
          method: 'EMAIL',
          isEnabled: true,
          isSetupComplete: true, 
          hashedBackupCodes: [],
        },
      });

      return created;
    });

    try {
      const otp = await otpService.generate(
        lawyer.id, 'lawyer', 'EMAIL_VERIFICATION'
      );
      await notificationService.sendOtpEmail({
        to: email,
        otp,
        purpose: 'EMAIL_VERIFICATION',
        recipientName: name,
      });
    } catch (err) {
      logger.warn('OTP dispatch failed after registration', { lawyerId: lawyer.id, err });
    }

    logger.info('Lawyer registered', {
      lawyerId: lawyer.id,
      verificationStatus,
      formatErrors: validationErrors.length,
    });

    return {
      lawyer,
      verificationStatus,
      validationErrors: validationErrors.length > 0 ? validationErrors : undefined,
      message: allFormatsPassed
        ? 'Registration successful. Check your email for the verification code.'
        : 'Registration submitted. Some details need correction — see validationErrors.',
    };
  }


  async verifyEmail(email: string, otp: string) {
    const normalizedEmail = email.trim().toLowerCase();

    const existingLawyer = await prisma.lawyerUser.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });

    if (!existingLawyer) {
      throw new AppError('Lawyer account not found', 404, 'USER_NOT_FOUND');
    }

    await otpService.verify(existingLawyer.id, 'lawyer', 'EMAIL_VERIFICATION', otp);

    const lawyer = await prisma.lawyerUser.update({
      where: { email: normalizedEmail },
      data: { emailVerified: true },
      select: { id: true, email: true, name: true, verificationStatus: true },
    });

    logger.info('Lawyer email verified', { lawyerId: lawyer.id });
    return lawyer;
  }


  async loginStep1(email: string, password: string) {
    const lawyer = await prisma.lawyerUser.findUnique({
      where: { email },
      select: {
        id: true, email: true, name: true, password: true,
        isLocked: true, lockReason: true,
        verificationStatus: true, emailVerified: true,
        failedLoginAttempts: true,
      },
    });

    if (!lawyer || !lawyer.password) {
      throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }

    if (lawyer.isLocked) {
      throw new AppError(
        `Account is locked. Reason: ${lawyer.lockReason || 'Security hold'}`,
        403,
        'ACCOUNT_LOCKED'
      );
    }

    if (lawyer.verificationStatus === 'FORMAT_FAILED') {
      throw new AppError(
        'Account registration has validation errors. Please contact support.',
        403,
        'ACCOUNT_NOT_VERIFIED'
      );
    }

    const isPasswordValid = await bcrypt.compare(password, lawyer.password);

    if (!isPasswordValid) {
      await this.handleFailedLogin(lawyer.id, lawyer.failedLoginAttempts);
      throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }

    await prisma.lawyerUser.update({
      where: { id: lawyer.id },
      data: { failedLoginAttempts: 0 },
    });

    const otp = await otpService.generate(lawyer.id, 'lawyer', 'LOGIN_2FA');
    await notificationService.sendOtpEmail({
      to: lawyer.email,
      otp,
      purpose: 'LOGIN_2FA',
      recipientName: lawyer.name,
    });

    const twoFactorToken = generateTwoFaTempToken(lawyer.id, 'LAWYER');

    logger.info('Lawyer login step-1 complete, OTP sent', { lawyerId: lawyer.id });

    return {
      requiresTwoFactor: true,
      twoFactorToken,
      message: 'OTP sent to your registered email. Valid for 10 minutes.',
    };
  }


  async loginStep2(twoFactorToken: string, otp: string, ipAddress?: string) {
    const tokenPayload = verifyTwoFaTempToken(twoFactorToken);
    const lawyerId = tokenPayload.sub;

    await otpService.verify(lawyerId, 'lawyer', 'LOGIN_2FA', otp);

    const lawyer = await prisma.lawyerUser.findUnique({
      where: { id: lawyerId },
      select: {
        id: true, email: true, name: true,
        verificationStatus: true, barCouncilState: true,
        practiceAreas: true,
      },
    });

    if (!lawyer) {
      throw new AppError('Lawyer account not found', 404, 'USER_NOT_FOUND');
    }

    await prisma.lawyerUser.update({
      where: { id: lawyerId },
      data: { lastLoginAt: new Date() },
    });

    const { accessToken, refreshToken } = generateLawyerTokens(
      lawyerId,
      lawyer.verificationStatus
    );

    await this.storeRefreshToken(lawyerId, refreshToken, ipAddress);

    logger.info('Lawyer login complete', { lawyerId });

    return {
      lawyer: {
        id: lawyer.id,
        email: lawyer.email,
        name: lawyer.name,
        userType: 'LAWYER',
        verificationStatus: lawyer.verificationStatus,
        barCouncilState: lawyer.barCouncilState,
        practiceAreas: lawyer.practiceAreas,
      },
      accessToken,
      refreshToken,
    };
  }

  async refreshTokens(refreshToken: string) {
    const decoded = verifyRefreshToken(refreshToken);

    if (decoded.userType !== 'LAWYER') {
      throw new AppError('Invalid refresh token for lawyer', 401, 'INVALID_REFRESH');
    }

    const storedToken = await prisma.lawyerRefreshToken.findFirst({
      where: {
        lawyerId: decoded.sub,
        token: refreshToken,
        expiresAt: { gte: new Date() },
      },
    });

    if (!storedToken) {
      throw new AppError('Refresh token not found or expired', 401, 'INVALID_REFRESH');
    }

    const lawyer = await prisma.lawyerUser.findUnique({
      where: { id: decoded.sub },
      select: { id: true, verificationStatus: true, isLocked: true },
    });

    if (!lawyer || lawyer.isLocked) {
      throw new AppError('Account is not accessible', 403, 'ACCOUNT_INACCESSIBLE');
    }

    await prisma.lawyerRefreshToken.delete({ where: { id: storedToken.id } });

    const { accessToken, refreshToken: newRefreshToken } = generateLawyerTokens(
      lawyer.id,
      lawyer.verificationStatus
    );

    await this.storeRefreshToken(lawyer.id, newRefreshToken);

    return { accessToken, refreshToken: newRefreshToken };
  }


  async logout(lawyerId: string, refreshToken: string) {
    await prisma.lawyerRefreshToken.deleteMany({
      where: { lawyerId, token: refreshToken },
    });

    await cacheService.clearUserCache(lawyerId);
    logger.info('Lawyer logged out', { lawyerId });
  }


  async requestPasswordReset(email: string) {
    const lawyer = await prisma.lawyerUser.findUnique({
      where: { email },
      select: { id: true, name: true, email: true, isLocked: true },
    });

    if (!lawyer || lawyer.isLocked) {
      return { message: 'If that email is registered, a reset code has been sent.' };
    }

    const otp = await otpService.generate(lawyer.id, 'lawyer', 'PASSWORD_RESET');
    await notificationService.sendOtpEmail({
      to: lawyer.email,
      otp,
      purpose: 'PASSWORD_RESET',
      recipientName: lawyer.name,
    });

    return { message: 'If that email is registered, a reset code has been sent.' };
  }

  async resetPassword(email: string, otp: string, newPassword: string) {
    const lawyer = await prisma.lawyerUser.findUnique({
      where: { email },
      select: { id: true },
    });

    if (!lawyer) {
      throw new AppError('Invalid request', 400, 'INVALID_RESET');
    }

    await otpService.verify(lawyer.id, 'lawyer', 'PASSWORD_RESET', otp);

    const pwErr = validatePasswordStrength(newPassword, 10);
    if (pwErr) throw new AppError(pwErr.reason, 400, 'WEAK_PASSWORD');

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await prisma.lawyerUser.update({
      where: { id: lawyer.id },
      data: {
        password: hashedPassword,
        failedLoginAttempts: 0,
        isLocked: false,
        lockedAt: null,
        lockReason: null,
      },
    });

    await prisma.lawyerRefreshToken.deleteMany({ where: { lawyerId: lawyer.id } });

    logger.info('Lawyer password reset', { lawyerId: lawyer.id });
    return { message: 'Password reset successfully. Please login with your new password.' };
  }


  private async handleFailedLogin(lawyerId: string, currentAttempts: number) {
    const newAttempts = currentAttempts + 1;
    const shouldLock = newAttempts >= 10;

    await prisma.lawyerUser.update({
      where: { id: lawyerId },
      data: {
        failedLoginAttempts: newAttempts,
        ...(shouldLock && {
          isLocked: true,
          lockedAt: new Date(),
          lockReason: 'Too many failed login attempts',
        }),
      },
    });

    if (shouldLock) {
      logger.warn('Lawyer account locked after 10 failed attempts', { lawyerId });
    }
  }

  private async storeRefreshToken(
    lawyerId: string,
    token: string,
    ipAddress?: string
  ) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await prisma.lawyerRefreshToken.create({
      data: { lawyerId, token, expiresAt, ipAddress },
    });
  }
}

export const lawyerAuthService = new LawyerAuthService();
export default lawyerAuthService;