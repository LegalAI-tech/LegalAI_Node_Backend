import prisma from '../../../config/database.js';
import { AppError } from '../../../middleware/error.middleware.js';
import { logger } from '../../../utils/logger.js';
import pythonBackendService from '../../../services/python-backend.service.js';
import workspaceMemoryService from '../workspace/workspace-memory.service.js';
import crypto from 'crypto';
const HISTORY_WINDOW = 10;
const MEMORY_REGEN_EVERY_N = 5;
class LawyerChatService {
    async createConversation(lawyerId, input) {
        const { matterId, documentId, documentName } = input;
        if (matterId) {
            const matter = await prisma.matter.findFirst({
                where: { id: matterId, lawyerId },
                select: { id: true, stage: true, title: true },
            });
            if (!matter) {
                throw new AppError('Matter not found.', 404, 'MATTER_NOT_FOUND');
            }
            if (matter.stage === 'ARCHIVED') {
                throw new AppError('Cannot start a conversation in an archived matter.', 400, 'MATTER_ARCHIVED');
            }
        }
        let resolvedDocName = documentName;
        if (documentId && matterId) {
            const doc = await prisma.matterDocument.findFirst({
                where: { id: documentId, matterId },
                select: { title: true, vectorIndexed: true },
            });
            if (!doc) {
                throw new AppError('Document not found in this matter.', 404, 'DOCUMENT_NOT_FOUND');
            }
            if (!doc.vectorIndexed) {
                throw new AppError('This document has not been indexed yet and cannot be used for chat.', 400, 'DOCUMENT_NOT_INDEXED');
            }
            resolvedDocName = resolvedDocName || doc.title;
        }
        const sessionId = crypto.randomUUID();
        const title = input.title?.trim() ||
            (matterId ? `Matter Chat — ${new Date().toLocaleString('en-IN')}` : `Legal Chat — ${new Date().toLocaleString('en-IN')}`);
        const conversation = await prisma.lawyerConversation.create({
            data: {
                id: crypto.randomUUID(),
                lawyerId,
                matterId: matterId ?? null,
                title,
                mode: 'AGENTIC',
                documentId: documentId ?? null,
                documentName: resolvedDocName ?? null,
                sessionId,
            },
        });
        logger.info('LawyerConversation created', {
            lawyerId,
            conversationId: conversation.id,
            matterId: matterId ?? 'standalone',
        });
        return conversation;
    }
    async listConversations(lawyerId, matterId) {
        const where = { lawyerId };
        if (matterId)
            where.matterId = matterId;
        const conversations = await prisma.lawyerConversation.findMany({
            where,
            orderBy: { lastMessageAt: 'desc' },
            select: {
                id: true,
                title: true,
                matterId: true,
                mode: true,
                documentId: true,
                documentName: true,
                sessionId: true,
                createdAt: true,
                lastMessageAt: true,
                summary: true,
                matter: { select: { title: true, stage: true } },
                _count: { select: { messages: true } },
            },
        });
        return conversations;
    }
    async getConversation(lawyerId, conversationId) {
        const conversation = await prisma.lawyerConversation.findFirst({
            where: { id: conversationId, lawyerId },
            include: {
                messages: {
                    orderBy: { createdAt: 'asc' },
                    select: {
                        id: true,
                        role: true,
                        content: true,
                        metadata: true,
                        memoryInjected: true,
                        createdAt: true,
                    },
                },
                matter: { select: { id: true, title: true, stage: true, caseNumber: true } },
            },
        });
        if (!conversation) {
            throw new AppError('Conversation not found.', 404, 'CONVERSATION_NOT_FOUND');
        }
        return conversation;
    }
    async deleteConversation(lawyerId, conversationId) {
        const conv = await prisma.lawyerConversation.findFirst({
            where: { id: conversationId, lawyerId },
            select: { id: true },
        });
        if (!conv) {
            throw new AppError('Conversation not found.', 404, 'CONVERSATION_NOT_FOUND');
        }
        await prisma.lawyerConversation.delete({ where: { id: conversationId } });
        return { message: 'Conversation deleted.' };
    }
    async sendMessage(lawyerId, conversationId, input) {
        const { message, selectedDocId, inputLanguage, outputLanguage } = input;
        const conversation = await prisma.lawyerConversation.findFirst({
            where: { id: conversationId, lawyerId },
            select: {
                id: true,
                matterId: true,
                sessionId: true,
                documentId: true,
                summary: true,
                memoryVersionAtInject: true,
            },
        });
        if (!conversation) {
            throw new AppError('Conversation not found.', 404, 'CONVERSATION_NOT_FOUND');
        }
        let vectorDocId;
        const activeDocId = selectedDocId || conversation.documentId;
        if (activeDocId) {
            const doc = await prisma.matterDocument.findFirst({
                where: {
                    id: activeDocId,
                    ...(conversation.matterId ? { matterId: conversation.matterId } : {}),
                },
                select: { vectorDocId: true, vectorIndexed: true, title: true },
            });
            if (doc?.vectorIndexed && doc.vectorDocId) {
                vectorDocId = doc.vectorDocId;
            }
        }
        let workspaceMemoryPayload;
        let currentMemoryVersion;
        let memoryInjected = false;
        if (conversation.matterId) {
            const memory = await prisma.workspaceMemory.findUnique({
                where: { matterId: conversation.matterId },
            });
            if (memory) {
                workspaceMemoryPayload = workspaceMemoryService.buildPayload(memory);
                currentMemoryVersion = memory.aiSummaryVersion;
                memoryInjected = true;
            }
        }
        const recentMessages = await prisma.lawyerMessage.findMany({
            where: { conversationId },
            orderBy: { createdAt: 'desc' },
            take: HISTORY_WINDOW,
            select: { role: true, content: true },
        });
        const history = recentMessages
            .reverse()
            .filter(m => m.role !== 'SYSTEM')
            .map(m => ({
            role: m.role.toLowerCase() === 'user' ? 'user' : 'assistant',
            content: m.content || " "
        }));
        const userMsg = await prisma.lawyerMessage.create({
            data: {
                id: crypto.randomUUID(),
                conversationId,
                role: 'USER',
                content: message,
                memoryInjected,
            },
        });
        let aiResponse;
        let sessionId = conversation.sessionId ?? undefined;
        let agentsUsed = [];
        let updatedSummaryStr;
        try {
            const result = await pythonBackendService.lawyerAgentChat({
                query: message,
                sessionId,
                documentId: vectorDocId,
                history,
                previousSummary: conversation.summary ?? null,
                matterId: conversation.matterId ?? undefined,
                workspaceMemory: workspaceMemoryPayload,
                conversationType: conversation.matterId ? 'matter_workspace' : 'standalone',
                inputLanguage,
                outputLanguage,
            });
            aiResponse = result.response ?? '';
            sessionId = result.session_id ?? sessionId;
            agentsUsed = result.agents_used ?? [];
            updatedSummaryStr = result.updated_summary;
        }
        catch (pyError) {
            logger.error('Python agent call failed in lawyer chat', {
                conversationId,
                error: pyError?.message,
            });
            throw new AppError('The AI service encountered an error. Please try again.', 502, 'AI_SERVICE_ERROR');
        }
        const assistantMsg = await prisma.lawyerMessage.create({
            data: {
                id: crypto.randomUUID(),
                conversationId,
                role: 'ASSISTANT',
                content: aiResponse,
                memoryInjected,
                metadata: {
                    agents_used: agentsUsed,
                    document_id: vectorDocId ?? null,
                },
            },
        });
        await prisma.lawyerConversation.update({
            where: { id: conversationId },
            data: {
                lastMessageAt: new Date(),
                sessionId,
                ...(updatedSummaryStr ? { summary: updatedSummaryStr, summaryUpdatedAt: new Date() } : {}),
                ...(memoryInjected && currentMemoryVersion !== undefined
                    ? { memoryVersionAtInject: currentMemoryVersion }
                    : {}),
            },
        });
        if (conversation.matterId) {
            this.maybeRegenerateMemory(lawyerId, conversation.matterId, conversationId).catch(() => { });
        }
        return {
            userMessage: {
                id: userMsg.id,
                role: 'USER',
                content: userMsg.content,
                createdAt: userMsg.createdAt,
            },
            assistantMessage: {
                id: assistantMsg.id,
                role: 'ASSISTANT',
                content: aiResponse,
                createdAt: assistantMsg.createdAt,
                metadata: { agents_used: agentsUsed, document_id: vectorDocId ?? null },
            },
            sessionId,
            memoryInjected,
        };
    }
    async maybeRegenerateMemory(lawyerId, matterId, conversationId) {
        try {
            const count = await prisma.lawyerMessage.count({
                where: { conversationId, role: 'USER' },
            });
            if (count > 0 && count % MEMORY_REGEN_EVERY_N === 0) {
                logger.info('Triggering background memory regeneration', { matterId, conversationId });
                await workspaceMemoryService.regenerateAiSummary(lawyerId, matterId);
            }
        }
        catch (err) {
            logger.warn('maybeRegenerateMemory failed silently', { matterId, err });
        }
    }
}
export default new LawyerChatService();
//# sourceMappingURL=lawyer-chat.service.js.map