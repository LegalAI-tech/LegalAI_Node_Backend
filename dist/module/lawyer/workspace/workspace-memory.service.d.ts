export interface UpdateMemoryInput {
    partySummary?: string;
    factChronology?: string;
    legalIssues?: string;
    keyDates?: {
        label: string;
        date: string;
    }[];
    lawyerNotes?: string;
}
export interface WorkspaceMemoryPayload {
    partySummary: string | null;
    factChronology: string | null;
    legalIssues: string | null;
    documentIndex: any | null;
    keyDates: any | null;
    lawyerNotes: string | null;
    aiSummary: string | null;
    estimatedTokens: number;
}
declare class WorkspaceMemoryService {
    getMemory(lawyerId: string, matterId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        matterId: string;
        partySummary: string | null;
        factChronology: string | null;
        legalIssues: string | null;
        documentIndex: import("@prisma/client/runtime/library").JsonValue | null;
        keyDates: import("@prisma/client/runtime/library").JsonValue | null;
        lawyerNotes: string | null;
        aiSummary: string | null;
        aiSummaryVersion: number;
        lastAiUpdateAt: Date | null;
        estimatedTokens: number;
    }>;
    updateMemory(lawyerId: string, matterId: string, input: UpdateMemoryInput): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        matterId: string;
        partySummary: string | null;
        factChronology: string | null;
        legalIssues: string | null;
        documentIndex: import("@prisma/client/runtime/library").JsonValue | null;
        keyDates: import("@prisma/client/runtime/library").JsonValue | null;
        lawyerNotes: string | null;
        aiSummary: string | null;
        aiSummaryVersion: number;
        lastAiUpdateAt: Date | null;
        estimatedTokens: number;
    }>;
    regenerateAiSummary(lawyerId: string, matterId: string): Promise<void>;
    appendDocumentToIndex(matterId: string, doc: {
        id: string;
        title: string;
        type: string;
        vectorDocId: string;
        aiSummary: string | null;
    }): Promise<void>;
    buildPayload(memory: any): WorkspaceMemoryPayload;
    private estimateTokens;
}
declare const _default: WorkspaceMemoryService;
export default _default;
//# sourceMappingURL=workspace-memory.service.d.ts.map