import type { Request, Response, NextFunction } from 'express';
import lawyerAuthService from './lawyerauth.service.js';
import firebaseAuthService from '../../../services/firebase-auth.service.js';
import type { LawyerAuthRequest } from '../../../middleware/auth.middleware.js';
import { AppError } from '../../../middleware/error.middleware.js';

class LawyerAuthController {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await lawyerAuthService.register(req.body);
      res.status(201).json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  async verifyEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, otp } = req.body;
      if (!email || typeof email !== 'string') {
        throw new AppError('email is required', 400, 'MISSING_EMAIL');
      }
      if (!otp || typeof otp !== 'string') {
        throw new AppError('otp is required', 400, 'MISSING_OTP');
      }
      const result = await lawyerAuthService.verifyEmail(email, otp);
      res.status(200).json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  async loginStep1(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      const result = await lawyerAuthService.loginStep1(email, password);
      res.status(200).json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  async loginStep2(req: Request, res: Response, next: NextFunction) {
    try {
      console.log('verify-2fa body:', JSON.stringify(req.body));
      const { twoFactorToken, otp } = req.body;
      const result = await lawyerAuthService.loginStep2(twoFactorToken, otp, req.ip);
      res.status(200).json({ success: true, data: result });
    } catch (error) { next(error); }
  }


  async googleFirebase(req: Request, res: Response, next: NextFunction) {
    try {
      const { idToken, phone, barNumber, barCouncilState, practiceAreas, yearsOfExperience } = req.body;

      if (!idToken || typeof idToken !== 'string') {
        throw new AppError('idToken is required', 400, 'MISSING_ID_TOKEN');
      }

      const result = await firebaseAuthService.lawyerGoogleLogin(idToken, {
        phone,
        barNumber,
        barCouncilState,
        practiceAreas,
        yearsOfExperience,
      });
      res.status(200).json({ success: true, data: result });
    } catch (error) { next(error); }
  }


  async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;
      const result = await lawyerAuthService.refreshTokens(refreshToken);
      res.status(200).json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  async logout(req: LawyerAuthRequest, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;
      await lawyerAuthService.logout(req.lawyer!.id, refreshToken);
      res.status(200).json({ success: true, message: 'Logged out successfully.' });
    } catch (error) { next(error); }
  }

  async requestPasswordReset(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await lawyerAuthService.requestPasswordReset(req.body.email);
      res.status(200).json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, otp, newPassword } = req.body;
      const result = await lawyerAuthService.resetPassword(email, otp, newPassword);
      res.status(200).json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  async getMe(req: LawyerAuthRequest, res: Response, next: NextFunction) {
    try {
      res.status(200).json({ success: true, data: req.lawyer });
    } catch (error) { next(error); }
  }
}

export default new LawyerAuthController();