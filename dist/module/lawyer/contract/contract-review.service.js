import prisma from '../../../config/database.js';
import { AppError } from '../../../middleware/error.middleware.js';
import { logger } from '../../../utils/logger.js';
import pythonBackendService from '../../../services/python-backend.service.js';
import workspaceMemoryService from '../workspace/workspace-memory.service.js';
function buildReviewPrompt(input) {
    const { mode, contractType = 'general', clientName } = input;
    const contractHint = contractType !== 'general' ? ` (${contractType} agreement)` : '';
    if (mode === 'professional') {
        return `
You are an expert Indian contract lawyer. Review the uploaded contract${contractHint} and provide a structured legal analysis.

Your analysis MUST follow this exact structure:

## CONTRACT OVERVIEW
- Type of agreement
- Parties involved
- Effective date and term
- Governing law and jurisdiction

## CLAUSE-BY-CLAUSE ANALYSIS
For each significant clause, identify:
- Clause name / heading
- Summary of what it says
- Risk level: LOW | MEDIUM | HIGH | CRITICAL
- Legal concern under Indian law (cite relevant statute or case law where applicable)
- Recommended redline or alternative clause

## KEY RISK FLAGS
List all HIGH and CRITICAL risk clauses with one-line summaries.
Focus on: jurisdiction, arbitration, limitation of liability, IP ownership,
non-compete, indemnity, termination, force majeure.

## INDIAN LAW COMPLIANCE ISSUES
Note any clauses that conflict with:
- Indian Contract Act 1872
- Specific Relief Act 1963
- IT Act 2000 (if applicable)
- Competition Act 2002 (for non-competes)
- Any other relevant Indian statutes

## RECOMMENDED ACTIONS
Prioritised list of changes the client should negotiate before signing.

Be precise. Cite section numbers. Use professional legal language.
`.trim();
    }
    const salutation = clientName ? `for ${clientName}` : '';
    return `
You are a plain-language legal advisor. Review the uploaded contract${contractHint} and explain it clearly ${salutation} — someone who is not a lawyer.

Your explanation MUST follow this structure:

## WHAT IS THIS CONTRACT?
One paragraph explaining what this agreement is and what it's for.

## KEY THINGS TO KNOW
5–8 bullet points covering the most important terms:
- What you are agreeing to do
- What the other party agrees to do
- How long this lasts
- How either party can end it
- What happens if something goes wrong

## WATCH OUT FOR
Explain in plain language any terms that could put you at risk. Avoid legal jargon.
For each risk, explain: what it means and why it matters to you.

## IMPORTANT DEADLINES AND DATES
List any time limits, notice periods, or key dates the client must remember.

## QUESTIONS TO ASK BEFORE SIGNING
3–5 questions the client should ask the other party or their lawyer before signing.

Use simple language. No Latin phrases. No legal citations. Write as if explaining to a friend.
`.trim();
}
class ContractReviewService {
    async review(lawyerId, file, input) {
        const { matterId, saveToMatter = false } = input;
        if (matterId) {
            const matter = await prisma.matter.findFirst({
                where: { id: matterId, lawyerId },
                select: { id: true },
            });
            if (!matter) {
                throw new AppError('Matter not found.', 404, 'MATTER_NOT_FOUND');
            }
        }
        const prompt = buildReviewPrompt(input);
        let result;
        try {
            result = await pythonBackendService.agentUploadAndChat(file.buffer, file.originalname, prompt);
        }
        catch (err) {
            logger.error('Contract review Python call failed', { lawyerId, error: err?.message });
            throw new AppError('The AI review service encountered an error. Please try again.', 502, 'AI_SERVICE_ERROR');
        }
        const reviewText = result.response ?? '';
        const vectorDocId = result.document_id ?? null;
        const fileUrl = result.storage_url ?? null;
        const sections = this.parseSections(reviewText);
        let savedDocId;
        if (matterId && saveToMatter) {
            savedDocId = await this.saveReviewToMatter(lawyerId, matterId, file.originalname, reviewText, vectorDocId, fileUrl, input.mode);
        }
        logger.info('Contract review completed', {
            lawyerId,
            matterId: matterId ?? 'no-matter',
            mode: input.mode,
            vectorDocId,
            saved: !!savedDocId,
        });
        return {
            mode: input.mode,
            contractFile: file.originalname,
            vectorDocId,
            fileUrl,
            rawReview: reviewText,
            sections,
            savedDocumentId: savedDocId ?? null,
        };
    }
    parseSections(text) {
        if (!text)
            return {};
        const sections = {};
        const parts = text.split(/^## /m).filter(p => p.trim());
        for (const part of parts) {
            const newlineIdx = part.indexOf('\n');
            if (newlineIdx === -1)
                continue;
            const heading = part.slice(0, newlineIdx).trim();
            const body = part.slice(newlineIdx + 1).trim();
            if (heading && body) {
                sections[heading] = body;
            }
        }
        return sections;
    }
    async saveReviewToMatter(lawyerId, matterId, originalName, content, vectorDocId, fileUrl, mode) {
        const title = `Contract Review (${mode}): ${originalName}`;
        const doc = await prisma.matterDocument.create({
            data: {
                matterId,
                uploadedBy: lawyerId,
                type: 'GENERATED',
                title,
                originalName,
                fileUrl,
                vectorDocId,
                vectorIndexed: !!vectorDocId,
                contentText: content,
                aiSummary: `${mode === 'professional' ? 'Professional legal' : 'Client-friendly'} review of ${originalName}`,
            },
        });
        if (vectorDocId) {
            workspaceMemoryService
                .appendDocumentToIndex(matterId, {
                id: doc.id,
                title,
                type: 'GENERATED',
                vectorDocId,
                aiSummary: doc.aiSummary,
            })
                .catch(() => { });
        }
        return doc.id;
    }
}
export default new ContractReviewService();
//# sourceMappingURL=contract-review.service.js.map