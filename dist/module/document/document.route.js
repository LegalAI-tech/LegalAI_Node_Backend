import { Router } from 'express';
import documentController from './document.controller.js';
import { authenticateUniversal } from '../../middleware/auth.middleware.js';
import { body, param, validationResult } from 'express-validator';
const router = Router();
router.use(authenticateUniversal);
const validateRequest = (req, res, next) => {
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
router.get('/templates', (req, res, next) => documentController.listTemplates(req, res, next));
router.get('/templates/:template_name/schema', templateNameValidation, validateRequest, (req, res, next) => documentController.getTemplateSchema(req, res, next));
router.get('/templates/:template_name/info', templateNameValidation, validateRequest, (req, res, next) => documentController.getTemplateInfo(req, res, next));
router.get('/templates/:template_name/critical-fields', templateNameValidation, validateRequest, (req, res, next) => documentController.getTemplateCriticalFields(req, res, next));
router.post('/', generateDocumentValidation, validateRequest, (req, res, next) => documentController.generateDocument(req, res, next));
router.get('/', (req, res, next) => documentController.getDocuments(req, res, next));
router.get('/:id', documentIdValidation, validateRequest, (req, res, next) => documentController.getDocument(req, res, next));
router.delete('/:id', documentIdValidation, validateRequest, (req, res, next) => documentController.deleteDocument(req, res, next));
router.get('/:id/download', documentIdValidation, validateRequest, (req, res, next) => documentController.downloadDocument(req, res, next));
export default router;
//# sourceMappingURL=document.route.js.map