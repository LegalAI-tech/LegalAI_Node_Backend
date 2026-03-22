export type ReviewMode = 'professional' | 'client';
export interface ContractReviewInput {
    mode: ReviewMode;
    matterId?: string;
    saveToMatter?: boolean;
    contractType?: string;
    clientName?: string;
}
declare class ContractReviewService {
    review(lawyerId: string, file: Express.Multer.File, input: ContractReviewInput): Promise<{
        mode: ReviewMode;
        contractFile: string;
        vectorDocId: string | null;
        fileUrl: string | null;
        rawReview: string;
        sections: Record<string, string>;
        savedDocumentId: string | null;
    }>;
    private parseSections;
    private saveReviewToMatter;
}
declare const _default: ContractReviewService;
export default _default;
//# sourceMappingURL=contract-review.service.d.ts.map