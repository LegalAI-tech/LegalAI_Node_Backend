import { Router } from 'express';
import type { RequestHandler } from 'express';
import multer from 'multer';
import lawyerChatController from './lawyer-chat.controller.js';
import { authenticateLawyer } from '../../../middleware/auth.middleware.js';
import { keepRequestContext } from '../../../middleware/request-id.middleware.js';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOC, DOCX, and TXT files are allowed.'));
    }
  }
});

router.use(authenticateLawyer as RequestHandler);

router.post('/conversations', lawyerChatController.createConversation as RequestHandler);
router.get('/conversations', lawyerChatController.listConversations as RequestHandler);
router.get('/conversations/:conversationId', lawyerChatController.getConversation as RequestHandler);
router.delete('/conversations/:conversationId', lawyerChatController.deleteConversation as RequestHandler);

router.post(
  '/conversations/:conversationId/messages',
  keepRequestContext(upload.single('file')),
  lawyerChatController.sendMessage as RequestHandler
);

export default router;