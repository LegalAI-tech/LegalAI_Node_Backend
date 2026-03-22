import chatService from './chat.service.js';
import { z } from 'zod';
class ChatController {
    async createConversation(req, res, next) {
        try {
            const userId = req.user.id;
            const { id, title, mode, documentId, documentName, sessionId } = req.body;
            if (!mode || !['NORMAL', 'AGENTIC'].includes(mode)) {
                return res.status(400).json({
                    success: false,
                    message: 'Mode is required and must be either NORMAL or AGENTIC',
                });
            }
            const conversationTitle = title || `${mode} Chat - ${new Date().toLocaleString()}`;
            const conversation = await chatService.createConversation(userId, conversationTitle, mode, documentId, documentName, sessionId, id);
            res.status(201).json({
                success: true,
                data: conversation,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async sendMessage(req, res, next) {
        try {
            const userId = req.user.id;
            const { conversationId } = req.params;
            const message = req.body?.message;
            const mode = req.body?.mode;
            const inputLanguage = req.body?.input_language;
            const outputLanguage = req.body?.output_language;
            if (!conversationId) {
                return res.status(400).json({
                    success: false,
                    message: 'Conversation ID is required',
                });
            }
            if (!message) {
                return res.status(400).json({
                    success: false,
                    message: 'Message is required',
                });
            }
            if (!mode || !['NORMAL', 'AGENTIC'].includes(mode)) {
                return res.status(400).json({
                    success: false,
                    message: 'Mode is required and must be either NORMAL or AGENTIC',
                });
            }
            const file = req.file
                ? { buffer: req.file.buffer, fileName: req.file.originalname }
                : undefined;
            const result = await chatService.sendMessage(userId, conversationId, message, mode, file, inputLanguage, outputLanguage);
            res.status(200).json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getConversations(req, res, next) {
        try {
            const userId = req.user.id;
            const conversations = await chatService.getConversations(userId);
            res.status(200).json({
                success: true,
                data: conversations,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getConversationMessages(req, res, next) {
        try {
            const userId = req.user.id;
            const { conversationId } = req.params;
            if (!conversationId) {
                return res.status(400).json({
                    success: false,
                    message: 'Conversation ID is required',
                });
            }
            const conversation = await chatService.getConversationMessages(userId, conversationId);
            res.status(200).json({
                success: true,
                data: conversation,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getConversationInfo(req, res, next) {
        try {
            const userId = req.user.id;
            const { conversationId } = req.params;
            if (!conversationId) {
                return res.status(400).json({
                    success: false,
                    message: 'Conversation ID is required',
                });
            }
            const info = await chatService.getConversationInfo(userId, conversationId);
            res.status(200).json({
                success: true,
                data: info,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async deleteConversation(req, res, next) {
        try {
            const userId = req.user.id;
            const { conversationId } = req.params;
            if (!conversationId) {
                return res.status(400).json({
                    success: false,
                    message: 'Conversation ID is required',
                });
            }
            await chatService.deleteConversation(userId, conversationId);
            res.status(200).json({
                success: true,
                message: 'Conversation deleted successfully',
            });
        }
        catch (error) {
            next(error);
        }
    }
    async deleteAllConversations(req, res, next) {
        try {
            const userId = req.user.id;
            const result = await chatService.deleteAllConversations(userId);
            res.status(200).json({
                success: true,
                message: `${result.deletedCount} conversation(s) deleted successfully`,
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async shareConversation(req, res, next) {
        try {
            const userId = req.user.id;
            const { conversationId } = req.params;
            const shareSchema = z.object({
                share: z.boolean()
            });
            const parseResult = shareSchema.safeParse(req.body);
            if (!parseResult.success) {
                return res.status(400).json({
                    success: false,
                    message: 'share must be true or false',
                });
            }
            const { share } = parseResult.data;
            if (!conversationId) {
                return res.status(400).json({
                    success: false,
                    message: 'Conversation ID is required',
                });
            }
            const result = await chatService.shareConversation(userId, conversationId, share, req);
            if (share) {
                res.status(200).json({
                    success: true,
                    data: {
                        link: result.link,
                        message: 'Conversation shared successfully',
                    },
                });
            }
            else {
                res.status(200).json({
                    success: true,
                    message: 'Conversation sharing disabled',
                });
            }
        }
        catch (error) {
            next(error);
        }
    }
    async getSharedConversation(req, res, next) {
        try {
            const { shareLink } = req.params;
            if (!shareLink) {
                return res.status(400).json({
                    success: false,
                    message: 'Share link is required',
                });
            }
            const result = await chatService.getSharedConversation(shareLink);
            res.status(200).json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
}
export default new ChatController();
//# sourceMappingURL=chat.controller.js.map