declare class ChatService {
    createConversation(userId: string, title: string, mode: 'NORMAL' | 'AGENTIC', documentId?: string, documentName?: string, sessionId?: string, clientProvidedId?: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        title: string;
        mode: import("@prisma/client").$Enums.ChatMode;
        documentId: string | null;
        documentName: string | null;
        sessionId: string | null;
        metadata: import("@prisma/client/runtime/library").JsonValue | null;
        language: string | null;
        isShared: boolean;
        lastMessageAt: Date;
    }>;
    sendMessage(userId: string, conversationId: string, message: string, mode: 'NORMAL' | 'AGENTIC', file?: {
        buffer: Buffer;
        fileName: string;
    }, inputLanguage?: string, outputLanguage?: string): Promise<{
        message: {
            id: string;
            createdAt: Date;
            metadata: import("@prisma/client/runtime/library").JsonValue | null;
            role: import("@prisma/client").$Enums.MessageRole;
            content: string;
            tokens: number | null;
            model: string | null;
            attachments: string[];
            conversationId: string;
        };
        conversation: {
            id: string;
            sessionId: string | undefined;
            documentId: string | undefined;
        };
    }>;
    getConversations(userId: string): Promise<any>;
    getConversationMessages(userId: string, conversationId: string): Promise<{
        messages: {
            id: string;
            createdAt: Date;
            metadata: import("@prisma/client/runtime/library").JsonValue | null;
            role: import("@prisma/client").$Enums.MessageRole;
            content: string;
            tokens: number | null;
            model: string | null;
            attachments: string[];
            conversationId: string;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        title: string;
        mode: import("@prisma/client").$Enums.ChatMode;
        documentId: string | null;
        documentName: string | null;
        sessionId: string | null;
        metadata: import("@prisma/client/runtime/library").JsonValue | null;
        language: string | null;
        isShared: boolean;
        lastMessageAt: Date;
    }>;
    deleteConversation(userId: string, conversationId: string): Promise<void>;
    deleteAllConversations(userId: string): Promise<{
        deletedCount: number;
    }>;
    getConversationInfo(userId: string, conversationId: string): Promise<{
        id: string;
        createdAt: Date;
        title: string;
        mode: import("@prisma/client").$Enums.ChatMode;
        documentId: string | null;
        documentName: string | null;
        sessionId: string | null;
    }>;
    shareConversation(userId: string, conversationId: string, share: boolean, req: any): Promise<{
        link: string;
        message?: undefined;
    } | {
        message: string;
        link?: undefined;
    }>;
    getSharedConversation(shareLink: string): Promise<{
        userName: string;
        conversation: {
            id: string;
            title: string;
            mode: import("@prisma/client").$Enums.ChatMode;
            createdAt: Date;
            messages: {
                id: string;
                createdAt: Date;
                role: import("@prisma/client").$Enums.MessageRole;
                content: string;
                attachments: string[];
            }[];
        };
        shareInfo: {
            viewCount: number;
            maxViews: number | null;
            expiresAt: Date | null;
        };
    }>;
}
declare const _default: ChatService;
export default _default;
//# sourceMappingURL=chat.service.d.ts.map