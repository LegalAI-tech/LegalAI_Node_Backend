export interface CreateMatterInput {
    title: string;
    caseNumber?: string;
    court?: string;
    practiceArea?: string;
    parties?: {
        plaintiff?: string;
        defendant?: string;
        [key: string]: string | undefined;
    };
    notes?: string;
}
export interface UpdateMatterInput {
    title?: string;
    caseNumber?: string;
    court?: string;
    practiceArea?: string;
    stage?: 'ACTIVE' | 'CLOSED' | 'ARCHIVED';
    parties?: Record<string, string>;
    notes?: string;
}
export interface ListMattersQuery {
    stage?: 'ACTIVE' | 'CLOSED' | 'ARCHIVED';
    practiceArea?: string;
    search?: string;
    page?: number;
    limit?: number;
}
declare class MatterService {
    createMatter(lawyerId: string, input: CreateMatterInput): Promise<{
        id: any;
        lawyerId: any;
        title: any;
        caseNumber: any;
        court: any;
        practiceArea: any;
        stage: any;
        parties: any;
        notes: any;
        archivedAt: any;
        createdAt: any;
        updatedAt: any;
        memory: {
            partySummary?: any;
            factChronology?: any;
            legalIssues?: any;
            documentIndex?: any;
            keyDates?: any;
            lawyerNotes?: any;
            aiSummaryVersion?: any;
            aiSummary: any;
            lastAiUpdateAt: any;
            estimatedTokens: any;
        } | null;
        documents: any;
        events: any;
        _count: any;
    }>;
    listMatters(lawyerId: string, query: ListMattersQuery): Promise<{
        matters: {
            id: any;
            lawyerId: any;
            title: any;
            caseNumber: any;
            court: any;
            practiceArea: any;
            stage: any;
            parties: any;
            notes: any;
            archivedAt: any;
            createdAt: any;
            updatedAt: any;
            memory: {
                partySummary?: any;
                factChronology?: any;
                legalIssues?: any;
                documentIndex?: any;
                keyDates?: any;
                lawyerNotes?: any;
                aiSummaryVersion?: any;
                aiSummary: any;
                lastAiUpdateAt: any;
                estimatedTokens: any;
            } | null;
            documents: any;
            events: any;
            _count: any;
        }[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    getMatter(lawyerId: string, matterId: string): Promise<{
        id: any;
        lawyerId: any;
        title: any;
        caseNumber: any;
        court: any;
        practiceArea: any;
        stage: any;
        parties: any;
        notes: any;
        archivedAt: any;
        createdAt: any;
        updatedAt: any;
        memory: {
            partySummary?: any;
            factChronology?: any;
            legalIssues?: any;
            documentIndex?: any;
            keyDates?: any;
            lawyerNotes?: any;
            aiSummaryVersion?: any;
            aiSummary: any;
            lastAiUpdateAt: any;
            estimatedTokens: any;
        } | null;
        documents: any;
        events: any;
        _count: any;
    }>;
    updateMatter(lawyerId: string, matterId: string, input: UpdateMatterInput): Promise<{
        id: any;
        lawyerId: any;
        title: any;
        caseNumber: any;
        court: any;
        practiceArea: any;
        stage: any;
        parties: any;
        notes: any;
        archivedAt: any;
        createdAt: any;
        updatedAt: any;
        memory: {
            partySummary?: any;
            factChronology?: any;
            legalIssues?: any;
            documentIndex?: any;
            keyDates?: any;
            lawyerNotes?: any;
            aiSummaryVersion?: any;
            aiSummary: any;
            lastAiUpdateAt: any;
            estimatedTokens: any;
        } | null;
        documents: any;
        events: any;
        _count: any;
    }>;
    archiveMatter(lawyerId: string, matterId: string): Promise<{
        message: string;
    }>;
    private formatMatter;
}
declare const _default: MatterService;
export default _default;
//# sourceMappingURL=matter.service.d.ts.map