import prisma from '../../config/database.js';
import pythonBackendService from '../../services/python-backend.service.js';
import cacheService from '../../services/cache.service.js';
import { AppError } from '../../middleware/error.middleware.js';
import crypto from 'crypto';
import {
  AgentChatResponse,
  UploadAndChatResponse,
  ChatResponse
} from '../../types/python-backend.types.js';

type AIResponse = AgentChatResponse | UploadAndChatResponse | ChatResponse;

function isUploadAndChatResponse(response: AIResponse): response is UploadAndChatResponse {
  return 'document_id' in response && 'agent_response' in response;
}

function isAgentChatResponse(response: AIResponse): response is AgentChatResponse {
  return 'session_id' in response && !('document_id' in response);
}

function getResponseText(response: AIResponse): string {
  try {
    let mainResponse: any = '';

    if (isUploadAndChatResponse(response)) {
      mainResponse = response.agent_response || '';
    } else if (isAgentChatResponse(response)) {
      mainResponse = response.response || '';
    } else {
      mainResponse = response.response || '';
    }

    if (!mainResponse || (typeof mainResponse === 'string' && mainResponse.trim() === '')) {
      const metadata = getMetadata(response);
      if (metadata.intermediate_steps && Array.isArray(metadata.intermediate_steps)) {
        const firstStep = metadata.intermediate_steps[0];
        if (firstStep && firstStep.result) {
          mainResponse = firstStep.result;
        }
      }
    }

    if (typeof mainResponse === 'string') {
      return mainResponse;
    } else if (typeof mainResponse === 'object' && mainResponse !== null) {
      if (mainResponse.answer) {
        let content = mainResponse.answer;
        if (mainResponse.sources) {
          content += '\n\n**Sources:**\n' + mainResponse.sources;
        }
        return content;
      } else if (mainResponse.response) {
        return typeof mainResponse.response === 'string' ? mainResponse.response : JSON.stringify(mainResponse.response);
      } else {
        return JSON.stringify(mainResponse);
      }
    }

    return mainResponse?.toString() || '';
  } catch (error) {
    console.error('Error extracting response text:', error);
    console.error('Response object:', JSON.stringify(response, null, 2));
    return '';
  }
}

function getSessionId(response: AIResponse): string | undefined {
  if (isUploadAndChatResponse(response)) {
    return response.session_id;
  } else if (isAgentChatResponse(response)) {
    return response.session_id;
  }
  return undefined;
}

function getDocumentId(response: AIResponse): string | undefined {
  if (isUploadAndChatResponse(response)) {
    return response.document_id;
  }
  return undefined;
}

function getSimplifiedMetadata(response: AIResponse): Record<string, any> {
  const baseMetadata: Record<string, any> = {
    tools_used: [],
  };

  const fullMetadata = getMetadata(response);
  const intermediateSteps = fullMetadata.intermediate_steps || [];

  const toolsWithDetails = intermediateSteps.map((step: any) => {
    const toolInfo: any = {
      tool: step.tool || 'unknown',
    };

    if (step.result) {
      if (typeof step.result === 'object') {
        if (step.result.query_time !== undefined) {
          toolInfo.query_time = step.result.query_time;
        }
        if (step.result.chunks_used !== undefined) {
          toolInfo.chunks_used = step.result.chunks_used;
        }
        if (step.result.total_chunks !== undefined) {
          toolInfo.total_chunks = step.result.total_chunks;
        }
      }
    }

    return toolInfo;
  });


  if (toolsWithDetails.length > 0) {
    baseMetadata.tools_used = toolsWithDetails;
  } else {
    let simpleTools: string[] = [];
    if (isUploadAndChatResponse(response)) {
      simpleTools = response.tools_used || [];
    } else if (isAgentChatResponse(response)) {
      simpleTools = response.tools_used || [];
    }
    baseMetadata.tools_used = simpleTools.map((tool: string) => ({ tool }));
  }

  if (isUploadAndChatResponse(response)) {
    baseMetadata.document_id = response.document_id;
  }

  let totalQueryTime = 0;
  let maxTotalChunks = 0;

  toolsWithDetails.forEach((tool: any) => {
    if (tool.query_time) totalQueryTime += tool.query_time;
    if (tool.total_chunks) maxTotalChunks = Math.max(maxTotalChunks, tool.total_chunks);
  });

  if (totalQueryTime > 0) {
    baseMetadata.total_query_time = Number(totalQueryTime.toFixed(2));
  }
  if (maxTotalChunks > 0) {
    baseMetadata.total_chunks = maxTotalChunks;
  }

  return baseMetadata;
}

function getMetadata(response: AIResponse): Record<string, any> {
  if (isUploadAndChatResponse(response)) {
    return {
      tools_used: response.tools_used,
      intermediate_steps: response.intermediate_steps,
      raw_results: response.raw_results,
      language_info: response.language_info,
      deduplication_info: response.deduplication_info,
      storage_url: response.storage_url,
    };
  } else if (isAgentChatResponse(response)) {
    return {
      tools_used: response.tools_used,
      intermediate_steps: response.intermediate_steps,
      raw_results: response.raw_results,
      language_info: response.language_info,
    };
  }
  return {};
}

class ChatService {
  async createConversation(
    userId: string,
    title: string,
    mode: 'NORMAL' | 'AGENTIC',
    documentId?: string,
    documentName?: string,
    sessionId?: string,
    clientProvidedId?: string
  ) {
    const conversationData: any = {
      userId,
      title,
      mode,
      documentId: documentId || null,
      documentName: documentName || null,
      sessionId: sessionId || null,
    };

    if (clientProvidedId) {
      conversationData.id = clientProvidedId;
    } else {
      conversationData.id = crypto.randomUUID();
    }

    const conversation = await prisma.conversation.create({
      data: conversationData,
    });

    return conversation;
  }

  async sendMessage(
    userId: string,
    conversationId: string,
    message: string,
    mode: 'NORMAL' | 'AGENTIC',
    file?: { buffer: Buffer; fileName: string },
    inputLanguage?: string,
    outputLanguage?: string
  ) {
    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, userId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 20,
        },
      },
    });

    if (!conversation) {
      throw new AppError('Conversation not found', 404);
    }

    if (!file) {
      const cachedResponse = await cacheService.getAIResponse(message, mode);
      if (cachedResponse) {
        const userMessage = await prisma.message.create({
          data: {
            id: crypto.randomUUID(),
            conversationId,
            role: 'USER',
            content: message,
          },
        });

        const assistantMessage = await prisma.message.create({
          data: {
            id: crypto.randomUUID(),
            conversationId,
            role: 'ASSISTANT',
            content: getResponseText(cachedResponse),
            metadata: {
              cached: true,
              ...getSimplifiedMetadata(cachedResponse)
            },
          },
        });

        await prisma.conversation.update({
          where: { id: conversationId },
          data: { lastMessageAt: new Date() },
        });

        return {
          message: assistantMessage,
          conversation: {
            id: conversationId,
            sessionId: getSessionId(cachedResponse),
            documentId: getDocumentId(cachedResponse)
          }
        };
      }
    }

    let aiResponse: AIResponse;

    if (file && mode === 'AGENTIC') {
      aiResponse = await pythonBackendService.agentUploadAndChat(
        file.buffer,
        file.fileName,
        message,
        conversation.sessionId || undefined,
        inputLanguage,
        outputLanguage
      );

      const updateData: { documentId?: string; documentName?: string; sessionId?: string } = {};

      const docId = getDocumentId(aiResponse);
      if (docId) {
        updateData.documentId = docId;
        updateData.documentName = file.fileName;
      }

      const newSessionId = getSessionId(aiResponse);
      if (newSessionId) {
        updateData.sessionId = newSessionId;
      }

      if (Object.keys(updateData).length > 0) {
        await prisma.conversation.update({
          where: { id: conversationId },
          data: updateData,
        });
      }
    } else if (conversation.documentId && mode === 'AGENTIC') {
      const sessionId = conversation.sessionId;
      aiResponse = await pythonBackendService.agentChat(
        message,
        sessionId || undefined,
        conversation.documentId
      );

      const newSessionId = getSessionId(aiResponse);
      if (newSessionId && newSessionId !== sessionId) {
        await prisma.conversation.update({
          where: { id: conversationId },
          data: { sessionId: newSessionId },
        });
      }
    } else if (mode === 'AGENTIC') {
      const sessionId = conversation.sessionId;
      aiResponse = await pythonBackendService.agentChat(
        message,
        sessionId || undefined
      );

      const newSessionId = getSessionId(aiResponse);
      if (newSessionId && newSessionId !== sessionId) {
        await prisma.conversation.update({
          where: { id: conversationId },
          data: { sessionId: newSessionId },
        });
      }
    } else {
      // Format conversation history for Python backend
      const history = conversation.messages.map(msg => ({
        role: msg.role.toLowerCase(), // Convert USER/ASSISTANT to user/assistant
        content: msg.content
      }));
      aiResponse = await pythonBackendService.chat(message, history);
    }

    if (!file) {
      await cacheService.cacheAIResponse(message, mode, aiResponse);
    }

    const userMessage = await prisma.message.create({
      data: {
        id: crypto.randomUUID(),
        conversationId,
        role: 'USER',
        content: message,
        attachments: file ? [file.fileName] : [],
      },
    });

    const responseText = getResponseText(aiResponse);
    const messageContent = responseText || 'AI response received but content could not be extracted.';

    const assistantMessage = await prisma.message.create({
      data: {
        id: crypto.randomUUID(),
        conversationId,
        role: 'ASSISTANT',
        content: messageContent,
        metadata: {
          ...getSimplifiedMetadata(aiResponse),
          document_id: conversation.documentId || getDocumentId(aiResponse),
        },
      },
    });

    await prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    });

    await cacheService.clearUserCache(userId);

    return {
      message: assistantMessage,
      conversation: {
        id: conversationId,
        sessionId: getSessionId(aiResponse),
        documentId: getDocumentId(aiResponse)
      }
    };
  }

  async getConversations(userId: string) {
    const cached = await cacheService.getUserData(`conversations:${userId}`);
    if (cached) return cached;

    const conversations = await prisma.conversation.findMany({
      where: { userId },
      orderBy: { lastMessageAt: 'desc' },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    await cacheService.cacheUserData(`conversations:${userId}`, conversations, 1800);

    return conversations;
  }

  async getConversationMessages(userId: string, conversationId: string) {
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        userId,
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!conversation) {
      throw new AppError('Conversation not found', 404);
    }

    return conversation;
  }

  async deleteConversation(userId: string, conversationId: string) {
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        userId,
      },
    });

    if (!conversation) {
      throw new AppError('Conversation not found', 404);
    }

    await prisma.conversation.delete({
      where: { id: conversationId },
    });

    await cacheService.clearUserCache(userId);
  }

  async deleteAllConversations(userId: string) {
    const result = await prisma.conversation.deleteMany({
      where: {
        userId,
      },
    });
    await cacheService.clearUserCache(userId);

    return {
      deletedCount: result.count,
    };
  }

  async getConversationInfo(userId: string, conversationId: string) {
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        userId,
      },
      select: {
        id: true,
        title: true,
        mode: true,
        documentId: true,
        documentName: true,
        sessionId: true,
        createdAt: true,
      },
    });

    if (!conversation) {
      throw new AppError('Conversation not found', 404);
    }

    return conversation;
  }

  async shareConversation(userId: string, conversationId: string, share: boolean, req: any) {
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        userId,
      },
    });

    if (!conversation) {
      throw new AppError('Conversation not found', 404);
    }

    if (share) {
      let existingLink = await prisma.sharedLink.findFirst({
        where: {
          userId,
          conversationId,
        },
      });

      if (!existingLink) {
        const hashedLink = crypto.randomBytes(8).toString('hex');

        existingLink = await prisma.sharedLink.create({
          data: {
            hashedLink,
            userId,
            conversationId,
          },
        });
      }

      await prisma.conversation.update({
        where: { id: conversationId },
        data: { isShared: true },
      });

      await prisma.user.update({
        where: { id: userId },
        data: { shareEnabled: true },
      });

      return {
        link: `${req.protocol}://${req.get('host')}/api/v1/chat/shared/${existingLink.hashedLink}`,
      };
    } else {
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { isShared: false },
      });

      await prisma.sharedLink.deleteMany({
        where: {
          userId,
          conversationId,
        },
      });

      return { message: 'Sharing disabled' };
    }
  }


  async getSharedConversation(shareLink: string) {
    const linkDoc = await prisma.sharedLink.findUnique({
      where: { hashedLink: shareLink },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            shareEnabled: true,
          },
        },
        conversation: {
          include: {
            messages: {
              orderBy: { createdAt: 'asc' },
              select: {
                id: true,
                role: true,
                content: true,
                createdAt: true,
                attachments: true,
              },
            },
          },
        },
      },
    });

    if (!linkDoc) {
      throw new AppError('Invalid share link', 404);
    }

    if (!linkDoc.user.shareEnabled) {
      throw new AppError('Sharing is disabled for this user', 403);
    }

    if (!linkDoc.conversation) {
      throw new AppError('Shared conversation not found', 404);
    }

    if (!linkDoc.conversation.isShared) {
      throw new AppError('This conversation is no longer shared', 403);
    }

    if (linkDoc.expiresAt && linkDoc.expiresAt < new Date()) {
      throw new AppError('Share link has expired', 403);
    }

    if (linkDoc.maxViews && linkDoc.viewCount >= linkDoc.maxViews) {
      throw new AppError('Share link view limit exceeded', 403);
    }

    await prisma.sharedLink.update({
      where: { id: linkDoc.id },
      data: { viewCount: linkDoc.viewCount + 1 },
    });

    return {
      userName: linkDoc.user.name || linkDoc.user.email,
      conversation: {
        id: linkDoc.conversation.id,
        title: linkDoc.conversation.title,
        mode: linkDoc.conversation.mode,
        createdAt: linkDoc.conversation.createdAt,
        messages: linkDoc.conversation.messages,
      },
      shareInfo: {
        viewCount: linkDoc.viewCount + 1,
        maxViews: linkDoc.maxViews,
        expiresAt: linkDoc.expiresAt,
      },
    };
  }
}

export default new ChatService();