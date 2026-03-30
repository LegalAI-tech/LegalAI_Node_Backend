import { Router } from 'express';
import type { RequestHandler } from 'express';
import multer from 'multer';
import matterDocumentController from './matter-document.controller.js';
import { authenticateLawyer } from '../../../middleware/auth.middleware.js';

const router = Router({ mergeParams: true });

router.use(authenticateLawyer as RequestHandler);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ];
    allowed.includes(file.mimetype)
      ? cb(null, true)
      : cb(new Error('Invalid file type. Allowed: PDF, DOC, DOCX, TXT.'));
  },
});

router.post('/', upload.single('file'), matterDocumentController.uploadDocument as RequestHandler);
router.get('/', matterDocumentController.listDocuments as RequestHandler);
router.delete('/:docId', matterDocumentController.deleteDocument as RequestHandler);

export default router;