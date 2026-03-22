import prisma from '../config/database.js';
import { verifyFirebaseToken } from '../config/firebase.js';
import { AppError } from '../middleware/error.middleware.js';
import { logger } from '../utils/logger.js';
import {
  generateCitizenTokens,
  generateTwoFaTempToken,
} from '../utils/jwt.utils.js';
import otpService from '../services/otp.service.js';
import notificationService from '../services/notification.service.js';
import encryptionService from '../services/encryption.service.js';
import { validateLawyerRegistration } from '../utils/validator.js';


class FirebaseAuthService {
  
  async citizenGoogleLogin(idToken: string) {
    const decoded = await verifyFirebaseToken(idToken);

    const { uid, email, name, picture } = decoded;

    if (!email) {
      throw new AppError(
        'Google account does not have an email address.',
        400,
        'NO_EMAIL_FROM_GOOGLE'
      );
    }


    let citizen = await prisma.user.findFirst({
      where: {
        OR: [
          { providerId: uid, provider: 'GOOGLE' },
          { email },
        ],
      },
    });

    if (!citizen) {
      citizen = await prisma.user.create({
        data: {
          email,
          name: name || email.split('@')[0],
          avatar: picture || null,
          provider: 'GOOGLE',
          providerId: uid,
          password: null,        
        },
      });

      logger.info('New user created via Google', { citizenId: citizen.id });
    } else if (citizen.provider === 'LOCAL') {
      citizen = await prisma.user.update({
        where: { id: citizen.id },
        data: {
          provider: 'GOOGLE',
          providerId: uid,
          avatar: citizen.avatar || picture || null,
        },
      });

      logger.info('user local account linked to Google', { citizenId: citizen.id });
    }

    await prisma.user.update({
      where: { id: citizen.id },
      data: { lastLoginAt: new Date() },
    });

    const { accessToken, refreshToken } = generateCitizenTokens(citizen.id);

    await prisma.refreshToken.create({
      data: {
        userId: citizen.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 
      },
    });

    logger.info('user Google login complete', { citizenId: citizen.id });

    return {
      user: {
        id: citizen.id,
        email: citizen.email,
        name: citizen.name,
        avatar: citizen.avatar,
        userType: 'CITIZEN',
        provider: 'GOOGLE',
      },
      accessToken,
      refreshToken,
    };
  }

  
  async lawyerGoogleLogin(idToken: string, additionalData?: {
    phone?: string;
    barNumber?: string;
    barCouncilState?: string;
    practiceAreas?: string[];
    yearsOfExperience?: number;
  }) {
    const decoded = await verifyFirebaseToken(idToken);
    const { uid, email, name, picture } = decoded;

    if (!email) {
      throw new AppError(
        'Google account does not have an email address.',
        400,
        'NO_EMAIL_FROM_GOOGLE'
      );
    }

    let lawyer = await prisma.lawyerUser.findFirst({
      where: {
        OR: [
          { providerId: uid, provider: 'GOOGLE' },
          { email },
        ],
      },
      select: {
        id: true, email: true, name: true,
        isLocked: true, lockReason: true,
        verificationStatus: true,
        provider: true, providerId: true,
      },
    });

    if (!lawyer) {
      const {
        phone = '0000000000',
        barNumber = 'PENDING',
        barCouncilState = 'PENDING',
        practiceAreas = [],
        yearsOfExperience,
      } = additionalData || {};

      const validationErrors = barNumber !== 'PENDING' && phone !== '0000000000' && barCouncilState !== 'PENDING'
        ? validateLawyerRegistration({
            email,
            password: '', // dummy
            name: name || email.split('@')[0],
            phone,
            barNumber,
            barCouncilState,
          })
        : [];

      const allFormatsPassed = validationErrors.length === 0 && barNumber !== 'PENDING';
      const verificationStatus = allFormatsPassed ? 'AUTO_VERIFIED' : 'PENDING';

      const created = await prisma.lawyerUser.create({
        data: {
          email,
          name: name || email.split('@')[0],
          provider: 'GOOGLE',
          providerId: uid,
          encryptedPhone: encryptionService.encrypt(phone.replace(/\s|-/g, '')),
          encryptedBarNumber: encryptionService.encrypt(barNumber.trim().toUpperCase()),
          barCouncilState: barCouncilState.toUpperCase().replace(/\s+/g, '_'),
          practiceAreas,
          yearsOfExperience,
          emailVerified: true,
          verificationStatus,
          verifiedAt: allFormatsPassed ? new Date() : null,
          barNumberFormatValid: allFormatsPassed,
          validationErrors: validationErrors.length > 0 ? (validationErrors as any) : undefined,
          twoFactorAuth: {
            create: {
              method: 'EMAIL',
              isEnabled: true,
              isSetupComplete: true,
              hashedBackupCodes: [],
            },
          },
        },
        select: {
          id: true, email: true, name: true,
          isLocked: true, lockReason: true, verificationStatus: true,
          provider: true, providerId: true,
        },
      });

      lawyer = created;
      logger.info('New LawyerUser created via Google', {
        lawyerId: lawyer.id,
        profileComplete: verificationStatus !== 'PENDING',
      });
    } else if (lawyer.provider === 'LOCAL') {
      await prisma.lawyerUser.update({
        where: { id: lawyer.id },
        data: { provider: 'GOOGLE', providerId: uid },
      });
    }

    if (!lawyer) {
      throw new AppError('Unable to resolve lawyer account for Google login', 500);
    }

    if (lawyer.isLocked) {
      throw new AppError(
        `Account is locked. Reason: ${lawyer.lockReason || 'Security hold'}`,
        403,
        'ACCOUNT_LOCKED'
      );
    }

    const otp = await otpService.generate(lawyer.id, 'lawyer', 'LOGIN_2FA');
    await notificationService.sendOtpEmail({
      to: lawyer.email,
      otp,
      purpose: 'LOGIN_2FA',
      recipientName: lawyer.name,
    });

    const twoFactorToken = generateTwoFaTempToken(lawyer.id, 'LAWYER');

    logger.info('LawyerUser Google login step-1 complete, OTP sent', {
      lawyerId: lawyer.id,
    });

    return {
      requiresTwoFactor: true,
      twoFactorToken,
      profileComplete: lawyer.verificationStatus !== 'PENDING',
      message: 'OTP sent to your registered email. Complete 2FA to continue.',
    };
  }

}

export const firebaseAuthService = new FirebaseAuthService();
export default firebaseAuthService;