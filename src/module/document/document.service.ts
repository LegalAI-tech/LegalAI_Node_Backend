import prisma from '../../config/database.js';
import pythonBackend from '../../services/python-backend.service.js';
import documentConverter, { type ConvertFormat } from './document-converter.js';
import { AppError } from '../../middleware/error.middleware.js';

class DocumentService {
  private ensureJ2Extension(templateName: string): string {
    return templateName.endsWith('.j2') ? templateName : `${templateName}.j2`;
  }

  async listTemplates() {
    return pythonBackend.listTemplates();
  }

  async getTemplateSchema(templateName: string) {
    return pythonBackend.getTemplateSchema(this.ensureJ2Extension(templateName));
  }

  async getTemplateInfo(templateName: string) {
    return pythonBackend.getTemplateInfo(this.ensureJ2Extension(templateName));
  }

  async getTemplateCriticalFields(templateName: string) {
    return pythonBackend.getTemplateCriticalFields(this.ensureJ2Extension(templateName));
  }

  async generateDocument(
    userId: string,
    templateName: string,
    data: Record<string, any>,
    format: ConvertFormat = 'pdf'
  ) {
    const result = await pythonBackend.generateDocument(templateName, data);

    const { buffer, mimeType, extension } = await documentConverter.convert(
      result.document_content || '',
      format
    );

    const displayName = templateName
      .replace('.j2', '')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
    const dateStr = new Date().toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    const title = `${displayName} - ${dateStr}`;

    const fileDataBase64 = buffer.toString('base64');

    const document = await prisma.document.create({
      data: {
        userId,
        title,
        content: result.document_content || '',
        format,
        fileUrl: `data:${mimeType};base64,${fileDataBase64}`,
        prompt: JSON.stringify(data),
        generatedBy: 'legal-ai-python-backend',
        metadata: {
          template_name: templateName,
          mime_type: mimeType,
          file_extension: extension,
          status: result.status,
          completion_percentage: result.completion_percentage,
          total_fields: result.total_fields,
          fields_provided: result.fields_provided,
          missing_fields: result.missing_fields ?? [],
          critical_fields_missing: result.critical_fields_missing ?? [],
          ai_generated_fields: result.ai_generated_fields ?? [],
          warning: result.warning ?? null,
        },
      },
    });

    return {
      document,
      fileBuffer: buffer,
      mimeType,
      extension,
      generationStatus: result.status,
      completionPercentage: result.completion_percentage,
      missingFields: result.missing_fields ?? [],
      warning: result.warning ?? null,
    };
  }

  async getDocumentFile(userId: string, documentId: string): Promise<{
    buffer: Buffer;
    mimeType: string;
    extension: string;
    title: string;
  }> {
    const document = await prisma.document.findFirst({
      where: { id: documentId, userId },
      select: { fileUrl: true, title: true, metadata: true },
    });

    if (!document) throw new AppError('Document not found', 404);
    if (!document.fileUrl?.startsWith('data:')) {
      throw new AppError('File not available for this document', 404);
    }

    const [header, base64Data] = document.fileUrl.split(',');
    if (!header || !base64Data) {
      throw new AppError('Invalid file URL format', 500);
    }
    const mimeType = header.replace('data:', '').replace(';base64', '');
    const buffer = Buffer.from(base64Data, 'base64');
    const meta = document.metadata as Record<string, any>;
    const extension = (meta?.file_extension as string) ?? 'bin';

    return { buffer, mimeType, extension, title: document.title };
  }

  async getUserDocuments(userId: string) {
    const documents = await prisma.document.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        format: true,
        fileUrl: true,
        createdAt: true,
      },
    });

    return documents;
  }

  async getDocument(userId: string, documentId: string) {
    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        userId,
      },
    });

    if (!document) {
      throw new AppError('Document not found', 404);
    }

    return document;
  }

  async deleteDocument(userId: string, documentId: string) {
    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        userId,
      },
    });

    if (!document) {
      throw new AppError('Document not found', 404);
    }

    await prisma.document.delete({
      where: { id: documentId },
    });
  }
}

export default new DocumentService();