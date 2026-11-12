import prisma from '../../../config/database.js';
import { AppError } from '../../../middleware/error.middleware.js';
import { logger } from '../../../utils/logger.js';
import pythonBackendService, { pythonCaller } from '../../../services/python-backend.service.js';
import { buildContractReviewPrompt } from '../../../prompts/contract-review.prompt.js';
import workspaceMemoryService from '../workspace/workspace-memory.service.js';

export type ReviewMode = 'professional' | 'client';

export interface ContractReviewInput {
  mode: ReviewMode;
  matterId?: string;
  saveToMatter?: boolean;
  contractType?: string;    
  clientName?: string;       
}


class ContractReviewService {

  async review(
    lawyerId: string,
    file: Express.Multer.File,
    input: ContractReviewInput
  ) {
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

    const prompt = buildContractReviewPrompt(input);

    let result: any;
    try {
      result = await pythonBackendService.agentUploadAndChat(
        pythonCaller.lawyer(lawyerId, matterId),
        file.buffer,
        file.originalname,
        prompt
      );
    } catch (err: any) {
      logger.error('Contract review Python call failed', { lawyerId, error: err?.message });
      throw new AppError(
        'The AI review service encountered an error. Please try again.',
        502,
        'AI_SERVICE_ERROR'
      );
    }

    const reviewText: string = result.response ?? '';
    const vectorDocId: string | null = result.document_id ?? null;
    const fileUrl: string | null = result.storage_url ?? null;

    const sections = this.parseSections(reviewText);

    let savedDocId: string | undefined;
    if (matterId && saveToMatter) {
      savedDocId = await this.saveReviewToMatter(
        lawyerId,
        matterId,
        file.originalname,
        reviewText,
        vectorDocId,
        fileUrl,
        input.mode
      );
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

  private parseSections(text: string): Record<string, string> {
    if (!text) return {};

    const sections: Record<string, string> = {};
    const parts = text.split(/^## /m).filter(p => p.trim());

    for (const part of parts) {
      const newlineIdx = part.indexOf('\n');
      if (newlineIdx === -1) continue;
      const heading = part.slice(0, newlineIdx).trim();
      const body = part.slice(newlineIdx + 1).trim();
      if (heading && body) {
        sections[heading] = body;
      }
    }

    return sections;
  }


  private async saveReviewToMatter(
    lawyerId: string,
    matterId: string,
    originalName: string,
    content: string,
    vectorDocId: string | null,
    fileUrl: string | null,
    mode: ReviewMode
  ): Promise<string> {
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
        .catch(() => {});
    }

    return doc.id;
  }
}

export default new ContractReviewService();