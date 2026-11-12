import prisma from '../../../config/database.js';
import { AppError } from '../../../middleware/error.middleware.js';
import { logger } from '../../../utils/logger.js';
import pythonBackendService, { pythonCaller } from '../../../services/python-backend.service.js';
import { buildMemoryRegenerationPrompt } from '../../../prompts/workspace-memory.prompt.js';


export interface UpdateMemoryInput {
  partySummary?: string;
  factChronology?: string;
  legalIssues?: string;
  keyDates?: { label: string; date: string }[];
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

// Shape of `workspace_updates` returned by the Python agent for a matter chat turn
export interface AiWorkspaceUpdates {
  party_summary?: string | null;
  fact_chronology?: string | null;
  legal_issues?: string | null;
  ai_summary?: string | null;
  key_dates?: unknown;
}

type KeyDate = { label: string; date: string };

const DEFAULT_KEY_DATE_LABEL = 'Mentioned in chat';

function nonEmpty(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

/** Keeps what is already there; uses the AI's suggestion only for an empty field. */
function fillIfEmpty(current: string | null, suggestion: unknown): string | null {
  return current?.trim() ? current : nonEmpty(suggestion) ?? current;
}

function isCalendarDate(value: string): boolean {
  // Round-trip rejects impossible dates such as 2026-02-30
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
    && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
    && new Date(`${value}T00:00:00Z`).toISOString().startsWith(value);
}

/**
 * Accepts the AI's key dates as "YYYY-MM-DD" strings or {label, date} objects
 * and drops anything that is not a real calendar date.
 */
export function normalizeKeyDates(raw: unknown): KeyDate[] {
  if (!Array.isArray(raw)) return [];

  return raw.flatMap((item): KeyDate[] => {
    const date = typeof item === 'string' ? item.trim() : nonEmpty(item?.date);
    if (!date || !isCalendarDate(date)) return [];

    const label = (typeof item === 'object' && nonEmpty(item?.label)) || DEFAULT_KEY_DATE_LABEL;
    return [{ label, date }];
  });
}

/** Appends dates not already present; returns null when nothing is new. */
export function mergeKeyDates(existing: unknown, incoming: KeyDate[]): KeyDate[] | null {
  const current: KeyDate[] = Array.isArray(existing) ? (existing as KeyDate[]) : [];
  const known = new Set(current.map((d) => d?.date));
  const added: KeyDate[] = [];

  for (const keyDate of incoming) {
    if (known.has(keyDate.date)) continue;
    known.add(keyDate.date);
    added.push(keyDate);
  }

  return added.length ? [...current, ...added] : null;
}

class WorkspaceMemoryService {

  async getMemory(lawyerId: string, matterId: string) {
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


  async updateMemory(lawyerId: string, matterId: string, input: UpdateMemoryInput) {
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

  async regenerateAiSummary(lawyerId: string, matterId: string): Promise<void> {
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
      .flatMap(conv =>
        conv.messages
          .reverse()
          .map(m => `${m.role}: ${m.content.slice(0, 300)}`)
      )
      .join('\n');

    const currentMemory = matter.memory;

    const summarisationQuery = buildMemoryRegenerationPrompt({ memory: currentMemory, docContext, convContext });

    try {
      const result = await pythonBackendService.lawyerAgentChat(pythonCaller.lawyer(lawyerId, matterId), {
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
    } catch (error) {
      logger.error('WorkspaceMemory AI regeneration failed', { matterId, error });
    }
  }

  async appendDocumentToIndex(
    matterId: string,
    doc: { id: string; title: string; type: string; vectorDocId: string; aiSummary: string | null }
  ): Promise<void> {
    const memory = await prisma.workspaceMemory.findUnique({
      where: { matterId },
      select: { documentIndex: true },
    });

    if (!memory) return;

    const existing: any[] = Array.isArray(memory.documentIndex) ? memory.documentIndex as any[] : [];
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

  buildPayload(memory: any): WorkspaceMemoryPayload {
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

  /**
   * Apply the memory updates the AI extracted during a matter chat turn.
   * AI text only fills fields that are still empty, so it never overwrites
   * what a lawyer wrote. aiSummary is AI-owned and is replaced. New key dates
   * are appended. Returns true when anything changed.
   */
  async applyAiUpdates(matterId: string, updates: AiWorkspaceUpdates): Promise<boolean> {
    const memory = await prisma.workspaceMemory.upsert({
      where: { matterId },
      create: { matterId, estimatedTokens: 0 },
      update: {},
    });

    const merged = {
      partySummary: fillIfEmpty(memory.partySummary, updates.party_summary),
      factChronology: fillIfEmpty(memory.factChronology, updates.fact_chronology),
      legalIssues: fillIfEmpty(memory.legalIssues, updates.legal_issues),
      keyDates: mergeKeyDates(memory.keyDates, normalizeKeyDates(updates.key_dates)),
    };

    const aiSummary = nonEmpty(updates.ai_summary);
    const summaryChanged = !!aiSummary && aiSummary !== memory.aiSummary;

    const changed =
      merged.partySummary !== memory.partySummary ||
      merged.factChronology !== memory.factChronology ||
      merged.legalIssues !== memory.legalIssues ||
      merged.keyDates !== null ||
      summaryChanged;

    if (!changed) return false;

    const keyDates = merged.keyDates ?? (memory.keyDates as KeyDate[] | null) ?? undefined;

    await prisma.workspaceMemory.update({
      where: { matterId },
      data: {
        partySummary: merged.partySummary,
        factChronology: merged.factChronology,
        legalIssues: merged.legalIssues,
        ...(merged.keyDates ? { keyDates: merged.keyDates } : {}),
        ...(summaryChanged
          ? { aiSummary, aiSummaryVersion: { increment: 1 }, lastAiUpdateAt: new Date() }
          : {}),
        estimatedTokens: this.estimateTokens({
          partySummary: merged.partySummary ?? undefined,
          factChronology: merged.factChronology ?? undefined,
          legalIssues: merged.legalIssues ?? undefined,
          keyDates,
          lawyerNotes: memory.lawyerNotes ?? undefined,
        }),
      },
    });

    logger.info('WorkspaceMemory updated from chat', { matterId, summaryChanged });

    return true;
  }

  private estimateTokens(input: UpdateMemoryInput): number {
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