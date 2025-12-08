import { Router } from 'express';
import multer from 'multer';
import chatController from './chat.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
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
        }
        else {
            cb(new Error('Invalid file type. Only PDF, DOC, DOCX, and TXT files are allowed.'));
        }
    }
});
router.get('/shared/:shareLink', chatController.getSharedConversation);
router.use(authenticate);
router.post('/conversations', chatController.createConversation);
router.post('/conversations/:conversationId/messages', upload.single('file'), chatController.sendMessage);
router.get('/conversations', chatController.getConversations);
router.get('/conversations/:conversationId', chatController.getConversationMessages);
router.delete('/conversations', chatController.deleteConversation);
router.delete('/conversations', chatController.deleteAllConversations);
router.get('/conversations/:conversationId/info', chatController.getConversationInfo);
router.post('/conversations/:conversationId/share', chatController.shareConversation);
router.delete('/conversations/:conversationId', chatController.deleteConversation);
export default router;
//# sourceMappingURL=chat.route.js.map