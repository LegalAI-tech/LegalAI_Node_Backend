export interface CreateConversationInput {
    title?: string;
    matterId?: string;
    documentId?: string;
    documentName?: string;
}
export interface SendMessageInput {
    message: string;
    selectedDocId?: string;
    inputLanguage?: string;
    outputLanguage?: string;
}
declare class LawyerChatService {
    createConversation(lawyerId: string, input: CreateConversationInput): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        lawyerId: string;
        title: string;
        mode: import("@prisma/client").$Enums.ChatMode;
        documentId: string | null;
        documentName: string | null;
        sessionId: string | null;
        metadata: import("@prisma/client/runtime/library").JsonValue | null;
        language: string | null;
        isShared: boolean;
        lastMessageAt: Date;
        summary: string | null;
        summaryUpdatedAt: Date | null;
        matterId: string | null;
        lastMemoryInjectedAt: Date | null;
        memoryVersionAtInject: number | null;
    }>;
    listConversations(lawyerId: string, matterId?: string): Promise<{
        id: string;
        createdAt: Date;
        _count: {
            messages: number;
        };
        matter: {
            title: string;
            stage: import("@prisma/client").$Enums.MatterStage;
        } | null;
        title: string;
        mode: import("@prisma/client").$Enums.ChatMode;
        documentId: string | null;
        documentName: string | null;
        sessionId: string | null;
        lastMessageAt: Date;
        summary: string | null;
        matterId: string | null;
    }[]>;
    getConversation(lawyerId: string, conversationId: string): Promise<{
        matter: {
            id: string;
            title: string;
            caseNumber: string | null;
            stage: import("@prisma/client").$Enums.MatterStage;
        } | null;
        messages: {
            id: string;
            createdAt: Date;
            metadata: import("@prisma/client/runtime/library").JsonValue;
            role: import("@prisma/client").$Enums.MessageRole;
            content: string;
            memoryInjected: boolean;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        lawyerId: string;
        title: string;
        mode: import("@prisma/client").$Enums.ChatMode;
        documentId: string | null;
        documentName: string | null;
        sessionId: string | null;
        metadata: import("@prisma/client/runtime/library").JsonValue | null;
        language: string | null;
        isShared: boolean;
        lastMessageAt: Date;
        summary: string | null;
        summaryUpdatedAt: Date | null;
        matterId: string | null;
        lastMemoryInjectedAt: Date | null;
        memoryVersionAtInject: number | null;
    }>;
    deleteConversation(lawyerId: string, conversationId: string): Promise<{
        message: string;
    }>;
    sendMessage(lawyerId: string, conversationId: string, input: SendMessageInput): Promise<{
        userMessage: {
            id: string;
            role: string;
            content: string;
            createdAt: Date;
        };
        assistantMessage: {
            id: string;
            role: string;
            content: string;
            createdAt: Date;
            metadata: {
                agents_used: string[];
                document_id: string | null;
            };
        };
        sessionId: string;
        memoryInjected: boolean;
    }>;
    private maybeRegenerateMemory;
}
declare const _default: LawyerChatService;
export default _default;
//# sourceMappingURL=lawyer-chat.service.d.ts.map