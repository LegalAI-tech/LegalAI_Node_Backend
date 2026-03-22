import type { Response, NextFunction } from 'express';
import type { LawyerAuthRequest } from '../../../middleware/auth.middleware.js';
import contractReviewService from './contract-review.service.js';

interface LawyerAuthRequestWithFile extends LawyerAuthRequest {
  file?: Express.Multer.File;
}

class ContractReviewController {

  async review(req: LawyerAuthRequestWithFile, res: Response, next: NextFunction) {
    try {
      const lawyerId = req.lawyer!.id;

      if (!req.file) {
        return res.status(400).json({ success: false, message: 'Contract file is required.' });
      }

      const { mode, matterId, saveToMatter, contractType, clientName } = req.body;

      if (!mode || !['professional', 'client'].includes(mode)) {
        return res.status(400).json({
          success: false,
          message: "Mode is required and must be 'professional' or 'client'.",
        });
      }

      const result = await contractReviewService.review(lawyerId, req.file, {
        mode,
        matterId,
        saveToMatter: saveToMatter === 'true' || saveToMatter === true,
        contractType,
        clientName,
      });

      res.status(200).json({ success: true, data: result });
    } catch (error) { next(error); }
  }
}

export default new ContractReviewController();