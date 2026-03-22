import prisma from '../../../config/database.js';
import { AppError } from '../../../middleware/error.middleware.js';
import { logger } from '../../../utils/logger.js';
import pythonBackendService from '../../../services/python-backend.service.js';
class WorkspaceMemoryService {
    async getMemory(lawyerId, matterId) {
        const matter = await prisma.matter.findFirst({
            where: { id: matterId, lawyerId },
            include: { memory: true },
        });
        if (!matter) {
            throw new AppError('Matter not found.', 404, 'MATTER_NOT_FOUND');
        }
        if (!matter.memory) {
            const memory = await prisma.workspaceMemory.create({
                data: { matterId, estimatedTokens: 0 },
            });
            return memory;
        }
        return matter.memory;
    }
    async updateMemory(lawyerId, matterId, input) {
        const matter = await prisma.matter.findFirst({
            where: { id: matterId, lawyerId },
            select: { id: true, memory: { select: { id: true } } },
        });
        if (!matter) {
            throw new AppError('Matter not found.', 404, 'MATTER_NOT_FOUND');
        }
        if (!matter.memory) {
            throw new AppError('Workspace memory not initialised.', 500, 'MEMORY_MISSING');
        }
        const updated = await prisma.workspaceMemory.update({
            where: { matterId },
            data: {
                ...(input.partySummary !== undefined && { partySummary: input.partySummary }),
                ...(input.factChronology !== undefined && { factChronology: input.factChronology }),
                ...(input.legalIssues !== undefined && { legalIssues: input.legalIssues }),
                ...(input.keyDates !== undefined && { keyDates: input.keyDates }),
                ...(input.lawyerNotes !== undefined && { lawyerNotes: input.lawyerNotes }),
                estimatedTokens: this.estimateTokens(input),
            },
        });
        logger.info('WorkspaceMemory manually updated', { lawyerId, matterId });
        return updated;
    }
    async regenerateAiSummary(lawyerId, matterId) {
        const matter = await prisma.matter.findFirst({
            where: { id: matterId, lawyerId },
            include: {
                memory: true,
                documents: {
                    where: { vectorIndexed: true },
                    select: { title: true, type: true, aiSummary: true },
                    take: 20,
                },
                conversations: {
                    orderBy: { lastMessageAt: 'desc' },
                    take: 3,
                    include: {
                        messages: {
                            orderBy: { createdAt: 'desc' },
                            take: 10,
                            select: { role: true, content: true, createdAt: true },
                        },
                    },
                },
            },
        });
        if (!matter || !matter.memory) {
            logger.warn('regenerateAiSummary: matter or memory not found', { matterId });
            return;
        }
        const docContext = matter.documents
            .filter(d => d.aiSummary)
            .map(d => `[${d.type}] ${d.title}: ${d.aiSummary}`)
            .join('\n');
        const convContext = matter.conversations
            .flatMap(conv => conv.messages
            .reverse()
            .map(m => `${m.role}: ${m.content.slice(0, 300)}`))
            .join('\n');
        const currentMemory = matter.memory;
        const summarisationQuery = `
You are a legal AI assistant updating the workspace memory for a legal matter.

CURRENT WORKSPACE MEMORY:
- Parties: ${currentMemory.partySummary || 'Not set'}
- Legal Issues: ${currentMemory.legalIssues || 'Not set'}
- Fact Chronology: ${currentMemory.factChronology || 'Not set'}
- Lawyer Notes: ${currentMemory.lawyerNotes || 'Not set'}

RECENT DOCUMENTS:
${docContext || 'No documents yet.'}

RECENT CONVERSATIONS:
${convContext || 'No conversations yet.'}

Based on all of the above, write a concise, structured AI summary of this legal matter (max 400 words).
Cover: key parties, core legal issues, current stage, and important next steps if apparent.
`.trim();
        try {
            const result = await pythonBackendService.lawyerAgentChat({
                query: summarisationQuery,
                matterId,
                workspaceMemory: this.buildPayload(matter.memory),
                conversationType: 'memory_regeneration',
                history: [],
            });
            const newSummary = result.response?.trim();
            if (newSummary) {
                await prisma.workspaceMemory.update({
                    where: { matterId },
                    data: {
                        aiSummary: newSummary,
                        aiSummaryVersion: { increment: 1 },
                        lastAiUpdateAt: new Date(),
                    },
                });
                logger.info('WorkspaceMemory AI summary regenerated', { matterId });
            }
        }
        catch (error) {
            logger.error('WorkspaceMemory AI regeneration failed', { matterId, error });
        }
    }
    async appendDocumentToIndex(matterId, doc) {
        const memory = await prisma.workspaceMemory.findUnique({
            where: { matterId },
            select: { documentIndex: true },
        });
        if (!memory)
            return;
        const existing = Array.isArray(memory.documentIndex) ? memory.documentIndex : [];
        const updated = [
            ...existing.filter(d => d.id !== doc.id), // remove stale entry if re-indexed
            {
                id: doc.id,
                title: doc.title,
                type: doc.type,
                vectorDocId: doc.vectorDocId,
                aiSummary: doc.aiSummary?.slice(0, 200) ?? null, // keep it compact in memory
            },
        ];
        await prisma.workspaceMemory.update({
            where: { matterId },
            data: { documentIndex: updated },
        });
    }
    buildPayload(memory) {
        return {
            partySummary: memory.partySummary ?? null,
            factChronology: memory.factChronology ?? null,
            legalIssues: memory.legalIssues ?? null,
            documentIndex: memory.documentIndex ?? null,
            keyDates: memory.keyDates ?? null,
            lawyerNotes: memory.lawyerNotes ?? null,
            aiSummary: memory.aiSummary ?? null,
            estimatedTokens: memory.estimatedTokens ?? 0,
        };
    }
    estimateTokens(input) {
        const totalChars = [
            input.partySummary,
            input.factChronology,
            input.legalIssues,
            input.lawyerNotes,
            JSON.stringify(input.keyDates ?? ''),
        ]
            .filter(Boolean)
            .reduce((sum, s) => sum + (s?.length ?? 0), 0);
        return Math.ceil(totalChars / 4);
    }
}
export default new WorkspaceMemoryService();
//# sourceMappingURL=workspace-memory.service.js.map