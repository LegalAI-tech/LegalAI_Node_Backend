import type { Response, NextFunction } from 'express';
import type { LawyerAuthRequest } from '../../../middleware/auth.middleware.js';
import matterDocumentService from './matter-document.service.js';

interface LawyerAuthRequestWithFile extends LawyerAuthRequest {
  file?: Express.Multer.File;
}

class MatterDocumentController {

  async uploadDocument(req: LawyerAuthRequestWithFile, res: Response, next: NextFunction) {
    try {
      const lawyerId = req.lawyer!.id;
      const { matterId } = req.params;

      if (!req.file) {
        return res.status(400).json({ success: false, message: 'File is required.' });
      }

      const { title, type } = req.body;

      const doc = await matterDocumentService.uploadDocument(
        lawyerId,
        matterId!,
        req.file,
        { title, type }
      );

      res.status(201).json({ success: true, data: doc });
    } catch (error) { next(error); }
  }

  async listDocuments(req: LawyerAuthRequest, res: Response, next: NextFunction) {
    try {
      const lawyerId = req.lawyer!.id;
      const { matterId } = req.params;
      const docs = await matterDocumentService.listDocuments(lawyerId, matterId!);
      res.status(200).json({ success: true, data: docs });
    } catch (error) { next(error); }
  }

  async deleteDocument(req: LawyerAuthRequest, res: Response, next: NextFunction) {
    try {
      const lawyerId = req.lawyer!.id;
      const { matterId, docId } = req.params;
      const result = await matterDocumentService.deleteDocument(lawyerId, matterId!, docId!);
      res.status(200).json({ success: true, data: result });
    } catch (error) { next(error); }
  }
}

export default new MatterDocumentController();