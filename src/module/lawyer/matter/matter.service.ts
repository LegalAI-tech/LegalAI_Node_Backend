import prisma from '../../../config/database.js';
import { AppError } from '../../../middleware/error.middleware.js';
import { logger } from '../../../utils/logger.js';

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

class MatterService {

  async createMatter(lawyerId: string, input: CreateMatterInput) {
    const { title, caseNumber, court, practiceArea, parties, notes } = input;

    if (!title || title.trim().length < 3) {
      throw new AppError('Matter title must be at least 3 characters.', 400, 'INVALID_TITLE');
    }

    const matter = await prisma.matter.create({
      data: {
        lawyerId,
        title: title.trim(),
        caseNumber: caseNumber?.trim() || null,
        court: court?.trim() || null,
        practiceArea: practiceArea?.trim() || null,
        stage: 'ACTIVE',
        parties: parties,
        notes: notes?.trim() || null,
        memory: {
          create: {
            estimatedTokens: 0,
          },
        },
      },
      include: {
        memory: true,
        _count: {
          select: { documents: true, conversations: true, events: true },
        },
      },
    });

    logger.info('Matter created', { lawyerId, matterId: matter.id });

    return this.formatMatter(matter);
  }

 
  async listMatters(lawyerId: string, query: ListMattersQuery) {
    const { stage, practiceArea, search, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: any = { lawyerId };

    if (stage) where.stage = stage;
    if (practiceArea) where.practiceArea = practiceArea;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { caseNumber: { contains: search, mode: 'insensitive' } },
        { court: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [matters, total] = await Promise.all([
      prisma.matter.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          memory: {
            select: { aiSummary: true, lastAiUpdateAt: true, estimatedTokens: true },
          },
          _count: {
            select: { documents: true, conversations: true, events: true },
          },
        },
      }),
      prisma.matter.count({ where }),
    ]);

    return {
      matters: matters.map(m => this.formatMatter(m)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getMatter(lawyerId: string, matterId: string) {
    const matter = await prisma.matter.findFirst({
      where: { id: matterId, lawyerId },
      include: {
        memory: true,
        documents: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            title: true,
            type: true,
            originalName: true,
            vectorIndexed: true,
            aiSummary: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        events: {
          orderBy: { eventDate: 'asc' },
          where: { status: { not: 'COMPLETED' } }, 
        },
        _count: {
          select: { documents: true, conversations: true, events: true },
        },
      },
    });

    if (!matter) {
      throw new AppError('Matter not found.', 404, 'MATTER_NOT_FOUND');
    }

    return this.formatMatter(matter);
  }

  async updateMatter(lawyerId: string, matterId: string, input: UpdateMatterInput) {
    const existing = await prisma.matter.findFirst({
      where: { id: matterId, lawyerId },
    });

    if (!existing) {
      throw new AppError('Matter not found.', 404, 'MATTER_NOT_FOUND');
    }

    if (existing.stage === 'ARCHIVED' && input.stage !== 'ARCHIVED') {
      throw new AppError(
        'Archived matters cannot be modified. Change stage to ACTIVE first if you intend to reopen.',
        400,
        'MATTER_ARCHIVED'
      );
    }

    const updated = await prisma.matter.update({
      where: { id: matterId },
      data: {
        ...(input.title && { title: input.title.trim() }),
        ...(input.caseNumber !== undefined && { caseNumber: input.caseNumber?.trim() || null }),
        ...(input.court !== undefined && { court: input.court?.trim() || null }),
        ...(input.practiceArea !== undefined && { practiceArea: input.practiceArea?.trim() || null }),
        ...(input.stage && { stage: input.stage }),
        ...(input.parties !== undefined && { parties: input.parties }),
        ...(input.notes !== undefined && { notes: input.notes?.trim() || null }),
        ...(input.stage === 'ARCHIVED' && { archivedAt: new Date() }),
        ...(input.stage === 'ACTIVE' && existing.stage === 'CLOSED' && { archivedAt: null }),
      },
      include: {
        memory: {
          select: { aiSummary: true, lastAiUpdateAt: true, estimatedTokens: true },
        },
        _count: {
          select: { documents: true, conversations: true, events: true },
        },
      },
    });

    logger.info('Matter updated', { lawyerId, matterId, changes: Object.keys(input) });

    return this.formatMatter(updated);
  }


  async archiveMatter(lawyerId: string, matterId: string) {
    const existing = await prisma.matter.findFirst({
      where: { id: matterId, lawyerId },
    });

    if (!existing) {
      throw new AppError('Matter not found.', 404, 'MATTER_NOT_FOUND');
    }

    if (existing.stage === 'ARCHIVED') {
      return { message: 'Matter is already archived.' };
    }

    await prisma.matter.update({
      where: { id: matterId },
      data: { stage: 'ARCHIVED', archivedAt: new Date() },
    });

    logger.info('Matter archived', { lawyerId, matterId });

    return { message: 'Matter archived successfully.' };
  }

  private formatMatter(matter: any) {
    return {
      id: matter.id,
      lawyerId: matter.lawyerId,
      title: matter.title,
      caseNumber: matter.caseNumber,
      court: matter.court,
      practiceArea: matter.practiceArea,
      stage: matter.stage,
      parties: matter.parties,
      notes: matter.notes,
      archivedAt: matter.archivedAt,
      createdAt: matter.createdAt,
      updatedAt: matter.updatedAt,
      memory: matter.memory
        ? {
            aiSummary: matter.memory.aiSummary,
            lastAiUpdateAt: matter.memory.lastAiUpdateAt,
            estimatedTokens: matter.memory.estimatedTokens,
            ...(matter.memory.partySummary !== undefined && {
              partySummary: matter.memory.partySummary,
              factChronology: matter.memory.factChronology,
              legalIssues: matter.memory.legalIssues,
              documentIndex: matter.memory.documentIndex,
              keyDates: matter.memory.keyDates,
              lawyerNotes: matter.memory.lawyerNotes,
              aiSummaryVersion: matter.memory.aiSummaryVersion,
            }),
          }
        : null,

      documents: matter.documents ?? undefined,

      events: matter.events ?? undefined,

      _count: matter._count,
    };
  }
}

export default new MatterService();