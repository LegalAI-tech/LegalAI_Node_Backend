import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import documentController from './document.controller.js';
import { authenticateUniversal, type AuthRequest } from '../../middleware/auth.middleware.js';
import { body, param, validationResult } from 'express-validator';

const router = Router();

router.use(authenticateUniversal);

const validateRequest = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }
  next();
};

const generateDocumentValidation = [
  body('template_name')
    .isString()
    .notEmpty()
    .withMessage('template_name is required and must be a non-empty string'),
  body('data')
    .isObject()
    .withMessage('data must be an object containing template field values'),
  body('format')
    .optional()
    .isString()
    .isIn(['pdf', 'docx', 'txt'])
    .withMessage('Format must be one of: pdf, docx, txt'),
];

const templateNameValidation = [
  param('template_name')
    .isString()
    .notEmpty()
    .withMessage('template_name is required'),
];

const documentIdValidation = [
  param('id')
    .isUUID()
    .withMessage('Document ID must be a valid UUID'),
];

router.get(
  '/templates',
  (req: Request, res: Response, next: NextFunction) =>
    documentController.listTemplates(req as AuthRequest, res, next)
);

router.get(
  '/templates/:template_name/schema',
  templateNameValidation,
  validateRequest,
  (req: Request, res: Response, next: NextFunction) =>
    documentController.getTemplateSchema(req as AuthRequest, res, next)
);

router.get(
  '/templates/:template_name/info',
  templateNameValidation,
  validateRequest,
  (req: Request, res: Response, next: NextFunction) =>
    documentController.getTemplateInfo(req as AuthRequest, res, next)
);

router.get(
  '/templates/:template_name/critical-fields',
  templateNameValidation,
  validateRequest,
  (req: Request, res: Response, next: NextFunction) =>
    documentController.getTemplateCriticalFields(req as AuthRequest, res, next)
);

router.post(
  '/',
  generateDocumentValidation,
  validateRequest,
  (req: Request, res: Response, next: NextFunction) =>
    documentController.generateDocument(req as AuthRequest, res, next)
);

router.get(
  '/',
  (req: Request, res: Response, next: NextFunction) =>
    documentController.getDocuments(req as AuthRequest, res, next)
);

router.get(
  '/:id',
  documentIdValidation,
  validateRequest,
  (req: Request, res: Response, next: NextFunction) =>
    documentController.getDocument(req as AuthRequest, res, next)
);

router.delete(
  '/:id',
  documentIdValidation,
  validateRequest,
  (req: Request, res: Response, next: NextFunction) =>
    documentController.deleteDocument(req as AuthRequest, res, next)
);

router.get(
  '/:id/download',
  documentIdValidation,
  validateRequest,
  (req: Request, res: Response, next: NextFunction) =>
    documentController.downloadDocument(req as AuthRequest, res, next)
);

export default router;