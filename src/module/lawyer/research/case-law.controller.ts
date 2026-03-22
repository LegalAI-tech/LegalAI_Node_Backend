import type { Response, NextFunction } from 'express';
import type { LawyerAuthRequest } from '../../../middleware/auth.middleware.js';
import caseLawService from './case-law.service.js';

class CaseLawController {

  async search(req: LawyerAuthRequest, res: Response, next: NextFunction) {
    try {
      const lawyerId = req.lawyer!.id;
      const {
        query, searchMode, matterId, saveToMatter,
        jurisdiction, input_language, output_language,
      } = req.body;

      if (!query?.trim()) {
        return res.status(400).json({ success: false, message: 'Query is required.' });
      }

      const result = await caseLawService.search(lawyerId, {
        query: query.trim(), searchMode, matterId,
        saveToMatter, jurisdiction,
        inputLanguage: input_language, outputLanguage: output_language,
      });

      res.status(200).json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  async saveSelected(req: LawyerAuthRequest, res: Response, next: NextFunction) {
    try {
      const lawyerId = req.lawyer!.id;
      const {
        matterId, query, searchMode, jurisdiction,
        summary, statutoryFramework, currentLegalPosition,
        selectedCaseIndices, allCases,
      } = req.body;

      if (!matterId) {
        return res.status(400).json({ success: false, message: 'matterId is required.' });
      }
      if (!Array.isArray(selectedCaseIndices) || selectedCaseIndices.length === 0) {
        return res.status(400).json({ success: false, message: 'No cases selected.' });
      }
      if (!Array.isArray(allCases) || allCases.length === 0) {
        return res.status(400).json({ success: false, message: 'allCases is required.' });
      }

      const result = await caseLawService.saveSelected(lawyerId, {
        matterId, query, searchMode, jurisdiction,
        summary, statutoryFramework, currentLegalPosition,
        selectedCaseIndices, allCases,
      });

      res.status(201).json({ success: true, data: result });
    } catch (error) { next(error); }
  }
}

export default new CaseLawController();