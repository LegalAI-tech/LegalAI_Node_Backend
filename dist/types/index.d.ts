export interface ToolUsageInfo {
    tool: string;
    query_time?: number;
    chunks_used?: number;
    total_chunks?: number;
}
export interface SimplifiedChatResponse {
    message: {
        id: string;
        content: string;
        role: 'ASSISTANT';
        createdAt: Date;
        metadata: {
            tools_used: ToolUsageInfo[];
            document_id?: string;
            cached?: boolean;
            total_query_time?: number;
            total_chunks?: number;
        };
    };
    conversation: {
        id: string;
        sessionId?: string;
        documentId?: string;
    };
}
//# sourceMappingURL=index.d.ts.map