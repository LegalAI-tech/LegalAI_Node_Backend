import prisma from '../../../config/database.js';
import { Prisma } from '@prisma/client';
import pythonBackendService, { pythonCaller } from '../../../services/python-backend.service.js';
import cacheService from '../../../services/cache.service.js';
import { AppError } from '../../../middleware/error.middleware.js';
import crypto from 'crypto';
import {
  AgentChatResponse,
  UploadAndChatResponse,
  ChatResponse
} from '../../../types/python-backend.types.js';

// Union type representing all possible response shapes from the Python AI backend
type AIResponse = AgentChatResponse | UploadAndChatResponse | ChatResponse;

/**
 * Type guard to check if an AI response is from an upload-and-chat session.
 * These responses contain both a `document_id` and a `response`.
 */
function isUploadAndChatResponse(response: AIResponse): response is UploadAndChatResponse {
  return 'document_id' in response && 'response' in response;
}

/**
 * Type guard to check if an AI response is from an agentic chat session.
 * These responses contain a `session_id` without an associated `document_id`.
 */
function isAgentChatResponse(response: AIResponse): response is AgentChatResponse {
  return 'session_id' in response && !('document_id' in response);
}

/**
 * Extracts and normalizes the primary textual answer from any AI response format.
 * Handles fallback steps, object payloads with sources, and string responses.
 *
 * @param response - The raw response payload from the Python AI backend.
 * @returns The extracted answer string, with sources formatted in Markdown if present.
 */
function getResponseText(response: AIResponse): string {
  try {
    let mainResponse: any = (response as any)?.response || '';

    // Fallback: If primary response is empty, check intermediate execution steps
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
      // Structure containing an answer and source citations
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

/**
 * Extracts the active session ID from an AI response if available.
 *
 * @param response - The AI response payload.
 * @returns The session ID string, or undefined.
 */
function getSessionId(response: AIResponse): string | undefined {
  return 'session_id' in response ? response.session_id : undefined;
}

/**
 * Extracts the document ID from an AI response if available.
 *
 * @param response - The AI response payload.
 * @returns The document ID string, or undefined.
 */
function getDocumentId(response: AIResponse): string | undefined {
  return 'document_id' in response ? (response.document_id || undefined) : undefined;
}

/**
 * Formats a simplified metadata object tailored for the client UI,
 * including participating agent names and document references.
 *
 * @param response - The raw AI response.
 * @returns A sanitized metadata dictionary for client consumption.
 */
function getSimplifiedMetadata(response: AIResponse): Record<string, any> {
  const baseMetadata: Record<string, any> = {
    agents_used: [],
  };

  const fullMetadata = getMetadata(response);
  const executionTrace = fullMetadata.execution_trace || [];

  if (executionTrace.length > 0) {
    baseMetadata.agents_used = executionTrace.map((step: any) => ({
      agent: step.agent || 'unknown',
    }));
  } else {
    const simpleAgents: string[] = ('agents_used' in response && response.agents_used) || [];
    baseMetadata.agents_used = simpleAgents.map((agent: string) => ({ agent }));
  }

  const docId = getDocumentId(response);
  if (docId) {
    baseMetadata.document_id = docId;
  }

  return baseMetadata;
}

/**
 * Extracts full technical metadata from the AI response,
 * including execution traces, agent outputs, language info, and storage URLs.
 *
 * @param response - The AI response payload.
 * @returns A dictionary of technical metadata.
 */
function getMetadata(response: AIResponse): Record<string, any> {
  if ('agents_used' in response || 'execution_trace' in response) {
    const resp = response as any;
    const metadata: Record<string, any> = {
      agents_used: resp.agents_used,
      execution_trace: resp.execution_trace,
      agent_outputs: resp.agent_outputs,
      language_info: resp.language_info,
    };
    if (resp.storage_url) {
      metadata.storage_url = resp.storage_url;
    }
    return metadata;
  }
  return {};
}

class ChatService {
  /**
   * Helper to find a conversation verifying user ownership, throwing a 404 AppError if not found.
   * Supports type-safe Prisma query options (select/include).
   *
   * @param userId - The ID of the authenticated user.
   * @param conversationId - The ID of the conversation to look up.
   * @param options - Additional Prisma findFirst options (select, include).
   * @returns The resolved conversation record.
   */
  private async findUserConversation<T extends Prisma.ConversationFindFirstArgs = Prisma.ConversationFindFirstArgs>(
    userId: string,
    conversationId: string,
    options?: Prisma.SelectSubset<T, Prisma.ConversationFindFirstArgs>
  ): Promise<Prisma.ConversationGetPayload<T>> {
    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, userId },
      ...(options as any),
    });

    if (!conversation) {
      throw new AppError('Conversation not found', 404);
    }

    return conversation as unknown as Prisma.ConversationGetPayload<T>;
  }

  /**
   * Creates a new conversation record in the database.
   * Supports optimistic UI creation when the client provides an ID upfront.
   *
   * @param userId - The ID of the owner user.
   * @param title - The conversation title.
   * @param mode - The chat mode: 'NORMAL' (standard QA) or 'AGENTIC' (multi-agent legal analysis).
   * @param documentId - Optional ID of an attached document.
   * @param documentName - Optional name of the attached document.
   * @param sessionId - Optional agent session ID.
   * @param clientProvidedId - Optional pre-generated ID from the frontend.
   * @returns The created conversation database record.
   */
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
      id: clientProvidedId || crypto.randomUUID(),
    };

    const conversation = await prisma.conversation.create({
      data: conversationData,
    });

    return conversation;
  }

  /**
   * Sends a message within a conversation and orchestrates the AI response lifecycle:
   * 1. Verifies conversation ownership and loads past messages/context.
   * 2. Dispatches to the Python backend based on mode and attachments.
   * 3. Synchronizes session and document IDs for agentic workflows.
   * 4. Persists USER and ASSISTANT messages to the database.
   * 5. Updates rolling conversation summary, timestamps, and invalidates user cache.
   *
   * @param userId - ID of the user sending the message.
   * @param conversationId - ID of the active conversation.
   * @param message - Text content of the user message.
   * @param mode - 'NORMAL' (standard RAG QA) or 'AGENTIC' (multi-agent research).
   * @param file - Optional uploaded file attachment (buffer and fileName).
   * @param inputLanguage - Optional source language code.
   * @param outputLanguage - Optional desired response language code.
   * @returns The newly created assistant message and updated conversation state.
   */
  async sendMessage(
    userId: string,
    conversationId: string,
    message: string,
    mode: 'NORMAL' | 'AGENTIC',
    file?: { buffer: Buffer; fileName: string },
    inputLanguage?: string,
    outputLanguage?: string
  ) {
    // 1. Fetch conversation and recent message context
    const conversation = await this.findUserConversation(userId, conversationId, {
      select: {
        id: true,
        userId: true,
        summary: true,
        sessionId: true,
        documentId: true,
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 20,
        },
      },
    });

    // AI responses are deliberately not cached: an answer depends on this
    // conversation's history, summary and documents, so the same text from
    // another user (or a later turn) must never reuse it.
    let aiResponse: AIResponse;

    // 2. Dispatch to Python AI service
    if (file && mode === 'AGENTIC') {
      aiResponse = await pythonBackendService.agentUploadAndChat(
        pythonCaller.citizen(userId),
        file.buffer,
        file.fileName,
        message,
        conversation.sessionId || undefined,
        inputLanguage,
        outputLanguage,
        conversation.summary || null
      );
    } else if (mode === 'AGENTIC') {
      aiResponse = await pythonBackendService.agentChat(
        pythonCaller.citizen(userId),
        message,
        conversation.sessionId || undefined,
        conversation.documentId || undefined,
        conversation.summary || null
      );
    } else {
      const historyItems = conversation.messages
        .filter((msg: any) => msg.role !== 'SYSTEM')
        .map((msg: any) => ({
          role: msg.role.toLowerCase() === 'user' ? 'user' : 'assistant',
          content: msg.content || ' ',
        }));

      aiResponse = await pythonBackendService.chat(message, historyItems, conversation.summary || undefined, {
        input_language: inputLanguage,
        output_language: outputLanguage,
      });
    }

    // 3. Synchronize agentic session and document details
    if (mode === 'AGENTIC') {
      const updateData: { documentId?: string; documentName?: string; sessionId?: string } = {};

      const docId = getDocumentId(aiResponse);
      if (docId && docId !== conversation.documentId) {
        updateData.documentId = docId;
        if (file) updateData.documentName = file.fileName;
      }

      const newSessionId = getSessionId(aiResponse);
      if (newSessionId && newSessionId !== conversation.sessionId) {
        updateData.sessionId = newSessionId;
      }

      if (Object.keys(updateData).length > 0) {
        await prisma.conversation.update({
          where: { id: conversationId },
          data: updateData,
        });
      }
    }

    // 4. Save user message to database
    await prisma.message.create({
      data: {
        id: crypto.randomUUID(),
        conversationId,
        role: 'USER',
        content: message,
        attachments: file ? [file.fileName] : [],
      },
    });

    // 5. Save assistant message to database
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

    // 6. Update rolling summary (if updated by AI) and last message timestamp
    const convUpdateData: Record<string, any> = { lastMessageAt: new Date() };
    const updatedSummary = (aiResponse as any).updated_summary;
    if (updatedSummary && typeof updatedSummary === 'string') {
      convUpdateData.summary = updatedSummary;
      convUpdateData.summaryUpdatedAt = new Date();
    }

    await prisma.conversation.update({
      where: { id: conversationId },
      data: convUpdateData,
    });

    // 7. Invalidate user conversation cache
    await cacheService.clearUserCache(userId);

    return {
      message: assistantMessage,
      conversation: {
        id: conversationId,
        sessionId: getSessionId(aiResponse),
        documentId: getDocumentId(aiResponse),
      },
    };
  }

  /**
   * Retrieves all conversations for a user, sorted by last message time descending.
   * Utilizes cache with a 30-minute TTL to reduce database load.
   *
   * @param userId - The ID of the authenticated user.
   * @returns Array of conversations including their most recent message preview.
   */
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

  /**
   * Fetches the complete message history for a conversation in chronological order.
   *
   * @param userId - ID of the authenticated user.
   * @param conversationId - ID of the conversation.
   * @returns Conversation record including its full list of messages.
   */
  async getConversationMessages(userId: string, conversationId: string) {
    return this.findUserConversation(userId, conversationId, {
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  /**
   * Deletes a single conversation and its associated messages.
   * Clears the user's cached conversation list.
   *
   * @param userId - ID of the authenticated user.
   * @param conversationId - ID of the conversation to delete.
   */
  async deleteConversation(userId: string, conversationId: string) {
    await this.findUserConversation(userId, conversationId);

    await prisma.conversation.delete({
      where: { id: conversationId },
    });

    await cacheService.clearUserCache(userId);
  }

  /**
   * Deletes all conversations belonging to a user and clears their cache.
   *
   * @param userId - ID of the authenticated user.
   * @returns Object containing the count of deleted conversations.
   */
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

  /**
   * Retrieves high-level conversation metadata (title, mode, document, session)
   * without loading message content.
   *
   * @param userId - ID of the authenticated user.
   * @param conversationId - ID of the conversation.
   * @returns The conversation metadata record.
   */
  async getConversationInfo(userId: string, conversationId: string) {
    return this.findUserConversation(userId, conversationId, {
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
  }

  /**
   * Toggles public sharing for a conversation.
   * When enabled, generates a unique hashed URL token and marks the conversation as shared.
   * When disabled, revokes existing share tokens.
   *
   * @param userId - ID of the authenticated user.
   * @param conversationId - ID of the conversation to share or unshare.
   * @param share - True to enable sharing, false to disable.
   * @param req - Express request object to construct the absolute public share URL.
   * @returns Object containing the public link or a confirmation message.
   */
  async shareConversation(userId: string, conversationId: string, share: boolean, req: any) {
    await this.findUserConversation(userId, conversationId);

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

  /**
   * Publicly fetches a shared conversation by its unique hashed link.
   * Validates link existence, user share settings, conversation share status,
   * expiration dates, and view limits before atomically incrementing view count.
   *
   * @param shareLink - The hashed share token from the URL.
   * @returns Sanitized public conversation transcript and share stats.
   */
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