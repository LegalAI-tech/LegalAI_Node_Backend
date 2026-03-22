import lawyerChatService from './lawyer-chat.service.js';
class LawyerChatController {
    async createConversation(req, res, next) {
        try {
            const lawyerId = req.lawyer.id;
            const conversation = await lawyerChatService.createConversation(lawyerId, req.body);
            res.status(201).json({ success: true, data: conversation });
        }
        catch (error) {
            next(error);
        }
    }
    async listConversations(req, res, next) {
        try {
            const lawyerId = req.lawyer.id;
            const { matterId } = req.query;
            const conversations = await lawyerChatService.listConversations(lawyerId, matterId);
            res.status(200).json({ success: true, data: conversations });
        }
        catch (error) {
            next(error);
        }
    }
    async getConversation(req, res, next) {
        try {
            const lawyerId = req.lawyer.id;
            const { conversationId } = req.params;
            const conversation = await lawyerChatService.getConversation(lawyerId, conversationId);
            res.status(200).json({ success: true, data: conversation });
        }
        catch (error) {
            next(error);
        }
    }
    async sendMessage(req, res, next) {
        try {
            const lawyerId = req.lawyer.id;
            const { conversationId } = req.params;
            const { message, selectedDocId, input_language, output_language } = req.body;
            if (!message?.trim()) {
                return res.status(400).json({ success: false, message: 'Message is required.' });
            }
            const result = await lawyerChatService.sendMessage(lawyerId, conversationId, {
                message: message.trim(),
                selectedDocId,
                inputLanguage: input_language,
                outputLanguage: output_language,
            });
            res.status(200).json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    async deleteConversation(req, res, next) {
        try {
            const lawyerId = req.lawyer.id;
            const { conversationId } = req.params;
            const result = await lawyerChatService.deleteConversation(lawyerId, conversationId);
            res.status(200).json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
}
export default new LawyerChatController();
//# sourceMappingURL=lawyer-chat.controller.js.map