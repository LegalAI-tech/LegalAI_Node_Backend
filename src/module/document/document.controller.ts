import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '../../middleware/auth.middleware.js';
import documentService from './document.service.js';

class DocumentController {
  async listTemplates(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const templates = await documentService.listTemplates();
      res.status(200).json({ success: true, data: templates });
    } catch (error) {
      next(error);
    }
  }

  async getTemplateSchema(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { template_name } = req.params;
      const schema = await documentService.getTemplateSchema(template_name!);
      res.status(200).json({ success: true, data: schema });
    } catch (error) {
      next(error);
    }
  }

  async getTemplateInfo(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { template_name } = req.params;
      const info = await documentService.getTemplateInfo(template_name!);
      res.status(200).json({ success: true, data: info });
    } catch (error) {
      next(error);
    }
  }

  async getTemplateCriticalFields(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { template_name } = req.params;
      const criticalFields = await documentService.getTemplateCriticalFields(template_name!);
      res.status(200).json({ success: true, data: criticalFields });
    } catch (error) {
      next(error);
    }
  }

  async generateDocument(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const userProvider = req.user!.provider;
      const { template_name, data, format } = req.body;

      const result = await documentService.generateDocument(userId, template_name, data, format, userProvider);

      const safeTitle = result.document.title.replace(/[^a-z0-9_\-. ]/gi, '_');
      res.setHeader('Content-Type', result.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}.${result.extension}"`);
      res.setHeader('X-Document-Id', result.document.id);
      res.setHeader('X-Generation-Status', result.generationStatus);
      res.setHeader('X-Completion-Percentage', String(result.completionPercentage));
      if (result.warning) {
        const safeWarning = result.warning
          .replace(/[\r\n]+/g, ' ')
          .replace(/[^\x20-\x7E]/g, '')
          .trim()
          .slice(0, 500);
        if (safeWarning) res.setHeader('X-Generation-Warning', safeWarning);
      }
      res.status(201).send(result.fileBuffer);
    } catch (error) {
      next(error);
    }
  }

  async getDocuments(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;

      const documents = await documentService.getUserDocuments(userId);

      res.status(200).json({
        success: true,
        data: documents,
      });
    } catch (error) {
      next(error);
    }
  }

  async getDocument(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Document ID is required',
        });
      }

      const document = await documentService.getDocument(userId, id);

      res.status(200).json({
        success: true,
        data: document,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteDocument(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Document ID is required',
        });
      }

      await documentService.deleteDocument(userId, id);

      res.status(200).json({
        success: true,
        message: 'Document deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
  async downloadDocument(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({ success: false, message: 'Document ID is required' });
      }

      const { buffer, mimeType, extension, title } =
        await documentService.getDocumentFile(userId, id);

      const safeTitle = title.replace(/[^a-z0-9_\-. ]/gi, '_');
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}.${extension}"`);
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  }
}

export default new DocumentController();