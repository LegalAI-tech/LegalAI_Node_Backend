import { Router } from 'express';
import lawyerChatController from './lawyer-chat.controller.js';
import { authenticateLawyer } from '../../../middleware/auth.middleware.js';
const router = Router();
router.use(authenticateLawyer);
router.post('/conversations', lawyerChatController.createConversation);
router.get('/conversations', lawyerChatController.listConversations);
router.get('/conversations/:conversationId', lawyerChatController.getConversation);
router.delete('/conversations/:conversationId', lawyerChatController.deleteConversation);
router.post('/conversations/:conversationId/messages', lawyerChatController.sendMessage);
export default router;
//# sourceMappingURL=lawyer-chat.route.js.map