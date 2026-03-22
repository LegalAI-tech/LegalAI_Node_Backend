import prisma from '../../../config/database.js';
import { AppError } from '../../../middleware/error.middleware.js';
import { logger } from '../../../utils/logger.js';
import pythonBackendService from '../../../services/python-backend.service.js';
import workspaceMemoryService from '../workspace/workspace-memory.service.js';
function buildResearchPrompt(input) {
    const { query, searchMode = 'general', jurisdiction = 'all' } = input;
    const jurisdictionClause = jurisdiction === 'all'
        ? 'across Supreme Court of India and all High Courts'
        : `from the ${jurisdiction}`;
    const jsonSchema = `
Return ONLY a valid JSON object in this exact shape — no markdown, no preamble, no explanation outside the JSON:
{
  "summary": "A 2-3 sentence overview of the legal position on this query.",
  "cases": [
    {
      "caseName": "Full case name e.g. Mohori Bibee v. Dharmodas Ghose",
      "citation": "Full citation e.g. (1903) 30 IA 114 or AIR 1963 SC 1 or (2022) 5 SCC 123",
      "court": "Supreme Court of India | Delhi High Court | Bombay High Court | etc.",
      "year": "4-digit year",
      "ratio": "The binding legal principle or ratio decidendi in 1-3 sentences.",
      "keyObservations": "Specific paragraphs, head-notes, or judicial observations directly relevant to the query. Quote briefly if needed.",
      "applicability": "How this case directly applies to the stated query or fact pattern. 1-2 sentences."
    }
  ],
  "statutoryFramework": "Relevant Indian statutes and sections, if any.",
  "currentLegalPosition": "1-2 sentences on the present settled position."
}`.trim();
    const modeContext = {
        fact_pattern: `You are an Indian legal research assistant. Find case law ${jurisdictionClause} matching this fact pattern: "${query}". Prioritise cases with similar facts. Note any cases that directly address partial payments, acknowledgements, or procedural variations as applicable.`,
        issue_specific: `You are an Indian legal research assistant. Find authoritative case law ${jurisdictionClause} on this legal issue: "${query}". Prioritise Supreme Court decisions. Note if any cases overrule prior precedents.`,
        statute: `You are an Indian legal research assistant. Explain the statutory provision and find leading interpretive cases ${jurisdictionClause}: "${query}". Include the exact provision text in the summary.`,
        general: `You are an Indian legal research assistant. Research the following query using Indian case law and statutes ${jurisdictionClause}: "${query}".`,
    };
    return `${modeContext[searchMode]}

${jsonSchema}

Include 3 to 6 of the most relevant cases. If fewer than 3 exist, include all available.
Do not include any text outside the JSON object.`;
}
class CaseLawService {
    async search(lawyerId, input) {
        const { matterId, saveToMatter = false, inputLanguage, outputLanguage } = input;
        if (matterId) {
            const matter = await prisma.matter.findFirst({
                where: { id: matterId, lawyerId },
                select: { id: true },
            });
            if (!matter)
                throw new AppError('Matter not found.', 404, 'MATTER_NOT_FOUND');
        }
        let workspaceMemoryPayload;
        if (matterId) {
            const memory = await prisma.workspaceMemory.findUnique({ where: { matterId } });
            if (memory)
                workspaceMemoryPayload = workspaceMemoryService.buildPayload(memory);
        }
        const prompt = buildResearchPrompt(input);
        let result;
        try {
            result = await pythonBackendService.lawyerAgentChat({
                query: prompt,
                matterId,
                workspaceMemory: workspaceMemoryPayload,
                conversationType: 'case_law_search',
                inputLanguage,
                outputLanguage,
            });
        }
        catch (err) {
            logger.error('Case-law search Python call failed', { lawyerId, error: err?.message });
            throw new AppError('The AI research service encountered an error. Please try again.', 502, 'AI_SERVICE_ERROR');
        }
        const responseText = result.response ?? '';
        const parsed = this.parseStructuredResponse(responseText);
        let savedDocId;
        if (matterId && saveToMatter && responseText) {
            savedDocId = await this.saveResearchToMatter(lawyerId, matterId, input.query, responseText);
        }
        logger.info('Case-law search completed', {
            lawyerId,
            matterId: matterId ?? 'no-matter',
            casesFound: parsed.cases.length,
            saved: !!savedDocId,
        });
        return {
            query: input.query,
            searchMode: input.searchMode ?? 'general',
            jurisdiction: input.jurisdiction ?? 'all',
            summary: parsed.summary,
            statutoryFramework: parsed.statutoryFramework,
            currentLegalPosition: parsed.currentLegalPosition,
            cases: parsed.cases,
            totalCasesFound: parsed.cases.length,
            rawResponse: responseText,
            savedDocumentId: savedDocId ?? null,
        };
    }
    async saveSelected(lawyerId, input) {
        const { matterId, query, searchMode, jurisdiction, summary, statutoryFramework, currentLegalPosition, selectedCaseIndices, allCases, } = input;
        const matter = await prisma.matter.findFirst({
            where: { id: matterId, lawyerId },
            select: { id: true },
        });
        if (!matter)
            throw new AppError('Matter not found.', 404, 'MATTER_NOT_FOUND');
        const selectedCases = allCases.filter(c => selectedCaseIndices.includes(c.index));
        if (selectedCases.length === 0) {
            throw new AppError('No matching cases found for the selected indices.', 400, 'NO_CASES');
        }
        const caseBlocks = selectedCases.map(c => `
## ${c.index}. ${c.caseName}
**Citation:** ${c.citation}
**Court:** ${c.court} (${c.year})

**Key Observations:**
${c.keyObservations || '—'}

**Applicability:**
${c.applicability || '—'}
`.trim()).join('\n\n---\n\n');
        const docContent = `# Case-Law Research
**Query:** ${query}
**Search Mode:** ${searchMode ?? 'general'}
**Jurisdiction:** ${jurisdiction ?? 'all'}
**Cases saved:** ${selectedCases.length} of ${allCases.length}

${summary ? `**Summary:** ${summary}\n` : ''}
${statutoryFramework ? `**Statutory Framework:** ${statutoryFramework}\n` : ''}
${currentLegalPosition ? `**Current Legal Position:** ${currentLegalPosition}\n` : ''}

---

${caseBlocks}`;
        const title = `Research (${selectedCases.length} cases): ${query.slice(0, 70)}${query.length > 70 ? '…' : ''}`;
        const doc = await prisma.matterDocument.create({
            data: {
                matterId,
                uploadedBy: lawyerId,
                type: 'GENERATED',
                title,
                contentText: docContent,
                vectorIndexed: false,
                aiSummary: `${selectedCases.length} cases on: ${query.slice(0, 180)}`,
            },
        });
        logger.info('Selected cases saved to matter', {
            lawyerId, matterId, docId: doc.id,
            casesSaved: selectedCases.length,
        });
        return {
            documentId: doc.id,
            title: doc.title,
            casesSaved: selectedCases.length,
        };
    }
    parseStructuredResponse(text) {
        const fallback = {
            summary: '',
            cases: [],
            statutoryFramework: '',
            currentLegalPosition: '',
        };
        if (!text?.trim())
            return fallback;
        try {
            const clean = text
                .replace(/^```json\s*/i, '')
                .replace(/^```\s*/i, '')
                .replace(/```\s*$/i, '')
                .trim();
            const parsed = JSON.parse(clean);
            const cases = (parsed.cases ?? []).map((c, i) => ({
                index: i + 1,
                caseName: c.caseName ?? 'Unknown',
                citation: c.citation ?? '—',
                court: c.court ?? '—',
                year: c.year ?? '—',
                ratio: c.ratio ?? '',
                keyObservations: c.keyObservations ?? '',
                applicability: c.applicability ?? '',
            }));
            return {
                summary: parsed.summary ?? '',
                cases,
                statutoryFramework: parsed.statutoryFramework ?? '',
                currentLegalPosition: parsed.currentLegalPosition ?? '',
            };
        }
        catch (parseErr) {
            logger.warn('Case-law JSON parse failed, returning raw', { parseErr });
            return {
                summary: '',
                cases: [
                    {
                        index: 1,
                        caseName: 'Research result',
                        citation: '—',
                        court: '—',
                        year: '—',
                        ratio: text,
                        keyObservations: '',
                        applicability: '',
                    },
                ],
                statutoryFramework: '',
                currentLegalPosition: '',
            };
        }
    }
    async saveResearchToMatter(lawyerId, matterId, query, content) {
        const title = `Research: ${query.slice(0, 80)}${query.length > 80 ? '…' : ''}`;
        const doc = await prisma.matterDocument.create({
            data: {
                matterId,
                uploadedBy: lawyerId,
                type: 'GENERATED',
                title,
                contentText: content,
                vectorIndexed: false,
                aiSummary: `Case-law research on: ${query.slice(0, 200)}`,
            },
        });
        return doc.id;
    }
}
export default new CaseLawService();
//# sourceMappingURL=case-law.service.js.map