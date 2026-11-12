import type { Prisma } from '@prisma/client';
import prisma from '../../../config/database.js';
import { AppError } from '../../../middleware/error.middleware.js';
import { logger } from '../../../utils/logger.js';
import pythonBackendService, { pythonCaller } from '../../../services/python-backend.service.js';
import workspaceMemoryService, { type AiWorkspaceUpdates } from '../workspace/workspace-memory.service.js';
import matterDocumentService from '../document/matter-document.service.js';
import crypto from 'crypto';

const HISTORY_WINDOW = 10;          
const MEMORY_REGEN_EVERY_N = 5;     

export interface CreateConversationInput {
  title?: string;
  matterId?: string;         
  documentId?: string;        
  documentName?: string;
}

// A file attached in a standalone chat, kept on the conversation for follow-up turns
interface StandaloneAttachment {
  vectorDocId: string;
  fileName: string;
}

function readStandaloneAttachment(metadata: Prisma.JsonValue | null): StandaloneAttachment | undefined {
  const attachment = (metadata as Record<string, any> | null)?.attachment;
  return typeof attachment?.vectorDocId === 'string' ? attachment : undefined;
}

export interface SendMessageInput {
  message: string;
  selectedDocId?: string;    
  inputLanguage?: string;
  outputLanguage?: string;
}

class LawyerChatService {

  async createConversation(lawyerId: string, input: CreateConversationInput) {
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
        throw new AppError(
          'This document has not been indexed yet and cannot be used for chat.',
          400,
          'DOCUMENT_NOT_INDEXED'
        );
      }

      resolvedDocName = resolvedDocName || doc.title;
    }

    const sessionId = crypto.randomUUID();
    const title =
      input.title?.trim() ||
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

  async listConversations(lawyerId: string, matterId?: string) {
    const where: any = { lawyerId };
    if (matterId) where.matterId = matterId;

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

  async getConversation(lawyerId: string, conversationId: string) {
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

  async deleteConversation(lawyerId: string, conversationId: string) {
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

  async sendMessage(
    lawyerId: string,
    conversationId: string,
    input: SendMessageInput,
    file?: Express.Multer.File
  ) {
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
        metadata: true,
      },
    });

    if (!conversation) {
      throw new AppError('Conversation not found.', 404, 'CONVERSATION_NOT_FOUND');
    }

    let vectorDocId: string | undefined;
    const activeDocId = selectedDocId || conversation.documentId;
    const standaloneAttachment = readStandaloneAttachment(conversation.metadata);

    if (file && conversation.matterId) {
      // In a matter, an attachment becomes a matter document and the chat's active document
      vectorDocId = await this.attachToMatter(lawyerId, conversationId, conversation.matterId, file);
    } else if (activeDocId) {
      const doc = await prisma.matterDocument.findFirst({
        where: {
          id: activeDocId,
          // Standalone chats have no matter, so ownership is checked through the document's matter
          matter: { lawyerId },
          ...(conversation.matterId ? { matterId: conversation.matterId } : {}),
        },
        select: { vectorDocId: true, vectorIndexed: true, title: true },
      });

      if (doc?.vectorIndexed && doc.vectorDocId) {
        vectorDocId = doc.vectorDocId;
      }
    } else if (!file && standaloneAttachment) {
      vectorDocId = standaloneAttachment.vectorDocId;
    }

    let workspaceMemoryPayload: Record<string, any> | undefined;
    let currentMemoryVersion: number | undefined;
    let memoryInjected = false;

    if (conversation.matterId) {
      const matter = await prisma.matter.findUnique({
        where: { id: conversation.matterId },
        include: { memory: true }
      });

      if (matter) {
        if (matter.memory) {
          workspaceMemoryPayload = workspaceMemoryService.buildPayload(matter.memory);
          currentMemoryVersion = matter.memory.aiSummaryVersion ?? undefined;
        } else {
          workspaceMemoryPayload = {
            partySummary: null, factChronology: null, legalIssues: null, documentIndex: null, keyDates: null, lawyerNotes: null, aiSummary: null, estimatedTokens: 0
          };
        }
        memoryInjected = true;

        if (!workspaceMemoryPayload.partySummary) {
          let partiesStr = '';
          try {
            const parties = matter.parties as any[];
            if (Array.isArray(parties)) {
              partiesStr = parties.map(p => `${p.role}: ${p.name}`).join(', ');
            }
          } catch(e) {}
          workspaceMemoryPayload.partySummary = `Case Title: ${matter.title}. Parties: ${partiesStr || 'Not explicitly listed yet.'}`;
        }

        if (!workspaceMemoryPayload.legalIssues && matter.practiceArea) {
           workspaceMemoryPayload.legalIssues = `Practice Area: ${matter.practiceArea}. ${matter.notes ? `Notes: ${matter.notes}` : ''}`;
        }
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
        attachments: file ? [file.originalname] : [],
        memoryInjected,
      },
    });

    let aiResponse: string;
    let sessionId = conversation.sessionId ?? undefined;
    let agentsUsed: string[] = [];
    let updatedSummaryStr: string | undefined;
    let workspaceUpdates: AiWorkspaceUpdates | undefined;
    let newAttachment: StandaloneAttachment | undefined;

    try {
      if (file && !conversation.matterId) {
        // Standalone chat: index the file and answer in one call; later turns reuse it
        const result = await pythonBackendService.agentUploadAndChat(
          pythonCaller.lawyer(lawyerId),
          file.buffer,
          file.originalname,
          message,
          sessionId,
          inputLanguage,
          outputLanguage,
          conversation.summary ?? null
        );

        aiResponse = result.response ?? '';
        sessionId = result.session_id ?? sessionId;
        agentsUsed = result.agents_used ?? [];
        updatedSummaryStr = result.updated_summary;
        vectorDocId = result.document_id ?? undefined;

        if (vectorDocId) {
          newAttachment = { vectorDocId, fileName: file.originalname };
        }
      } else {
        const result = await pythonBackendService.lawyerAgentChat(pythonCaller.lawyer(lawyerId, conversation.matterId ?? undefined), {
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
        workspaceUpdates = result.workspace_updates ?? undefined;
      }

    } catch (pyError: any) {
      logger.error('Python agent call failed in lawyer chat', {
        conversationId,
        error: pyError?.message,
      });
      throw new AppError(
        'The AI service encountered an error. Please try again.',
        502,
        'AI_SERVICE_ERROR'
      );
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
        ...(newAttachment
          ? {
              metadata: {
                ...((conversation.metadata as Prisma.JsonObject | null) ?? {}),
                attachment: { ...newAttachment },
              },
            }
          : {}),
      },
    });

    let memoryUpdated = false;

    if (conversation.matterId && workspaceUpdates) {
      try {
        memoryUpdated = await workspaceMemoryService.applyAiUpdates(conversation.matterId, workspaceUpdates);
      } catch (err) {
        logger.warn('Failed to apply AI memory updates', { matterId: conversation.matterId, err });
      }
    }

    if (conversation.matterId) {
      this.maybeRegenerateMemory(lawyerId, conversation.matterId, conversationId).catch(() => {});
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
      memoryUpdated,
    };
  }

  private async attachToMatter(
    lawyerId: string,
    conversationId: string,
    matterId: string,
    file: Express.Multer.File
  ): Promise<string> {
    const doc = await matterDocumentService.uploadDocument(lawyerId, matterId, file, {});

    if (!doc.vectorIndexed || !doc.vectorDocId) {
      throw new AppError(
        'The attachment was saved to the matter but could not be read. Please try again.',
        502,
        'ATTACHMENT_NOT_INDEXED'
      );
    }

    await prisma.lawyerConversation.update({
      where: { id: conversationId },
      data: { documentId: doc.id, documentName: doc.title },
    });

    return doc.vectorDocId;
  }

  private async maybeRegenerateMemory(
    lawyerId: string,
    matterId: string,
    conversationId: string
  ): Promise<void> {
    try {
      const count = await prisma.lawyerMessage.count({
        where: { conversationId, role: 'USER' },
      });

      if (count > 0 && count % MEMORY_REGEN_EVERY_N === 0) {
        logger.info('Triggering background memory regeneration', { matterId, conversationId });
        await workspaceMemoryService.regenerateAiSummary(lawyerId, matterId);
      }
    } catch (err) {
      logger.warn('maybeRegenerateMemory failed silently', { matterId, err });
    }
  }
}

export default new LawyerChatService();