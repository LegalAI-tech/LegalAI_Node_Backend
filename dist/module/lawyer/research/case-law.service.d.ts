export type SearchMode = 'fact_pattern' | 'issue_specific' | 'statute' | 'general';
export interface CaseLawSearchInput {
    query: string;
    searchMode?: SearchMode;
    matterId?: string;
    saveToMatter?: boolean;
    jurisdiction?: string;
    inputLanguage?: string;
    outputLanguage?: string;
}
export interface CaseCitation {
    index: number;
    caseName: string;
    citation: string;
    court: string;
    year: string;
    ratio: string;
    keyObservations: string;
    applicability: string;
}
declare class CaseLawService {
    search(lawyerId: string, input: CaseLawSearchInput): Promise<{
        query: string;
        searchMode: SearchMode;
        jurisdiction: string;
        summary: string;
        statutoryFramework: string;
        currentLegalPosition: string;
        cases: CaseCitation[];
        totalCasesFound: number;
        rawResponse: string;
        savedDocumentId: string | null;
    }>;
    saveSelected(lawyerId: string, input: {
        matterId: string;
        query: string;
        searchMode?: string;
        jurisdiction?: string;
        summary?: string;
        statutoryFramework?: string;
        currentLegalPosition?: string;
        selectedCaseIndices: number[];
        allCases: CaseCitation[];
    }): Promise<{
        documentId: string;
        title: string;
        casesSaved: number;
    }>;
    private parseStructuredResponse;
    private saveResearchToMatter;
}
declare const _default: CaseLawService;
export default _default;
//# sourceMappingURL=case-law.service.d.ts.map