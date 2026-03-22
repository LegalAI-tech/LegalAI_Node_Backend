import { Router } from 'express';
import type { RequestHandler } from 'express';
import lawyerChatController from './lawyer-chat.controller.js';
import { authenticateLawyer } from '../../../middleware/auth.middleware.js';

const router = Router();

router.use(authenticateLawyer as RequestHandler);

router.post('/conversations', lawyerChatController.createConversation as RequestHandler);
router.get('/conversations', lawyerChatController.listConversations as RequestHandler);
router.get('/conversations/:conversationId', lawyerChatController.getConversation as RequestHandler);
router.delete('/conversations/:conversationId', lawyerChatController.deleteConversation as RequestHandler);

router.post(
  '/conversations/:conversationId/messages',
  lawyerChatController.sendMessage as RequestHandler
);

export default router;