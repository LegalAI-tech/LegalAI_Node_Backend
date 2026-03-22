import prisma from '../../../config/database.js';
import { AppError } from '../../../middleware/error.middleware.js';
import { logger } from '../../../utils/logger.js';
import pythonBackendService from '../../../services/python-backend.service.js';
import workspaceMemoryService from '../workspace/workspace-memory.service.js';
const ALLOWED_MIME_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
];
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;
class MatterDocumentService {
    async uploadDocument(lawyerId, matterId, file, input) {
        const matter = await prisma.matter.findFirst({
            where: { id: matterId, lawyerId },
            select: { id: true, stage: true },
        });
        if (!matter) {
            throw new AppError('Matter not found.', 404, 'MATTER_NOT_FOUND');
        }
        if (matter.stage === 'ARCHIVED') {
            throw new AppError('Cannot add documents to an archived matter.', 400, 'MATTER_ARCHIVED');
        }
        if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
            throw new AppError('Invalid file type. Allowed: PDF, DOC, DOCX, TXT.', 400, 'INVALID_FILE_TYPE');
        }
        if (file.size > MAX_FILE_SIZE_BYTES) {
            throw new AppError('File too large. Maximum size is 20MB.', 400, 'FILE_TOO_LARGE');
        }
        const docType = this.resolveDocType(input.type);
        const title = input.title?.trim() || file.originalname;
        const doc = await prisma.matterDocument.create({
            data: {
                matterId,
                uploadedBy: lawyerId,
                type: docType,
                title,
                originalName: file.originalname,
                vectorIndexed: false,
            },
        });
        try {
            const indexResult = await pythonBackendService.agentUploadAndChat(file.buffer, file.originalname, 'Please analyse and index this legal document. Provide a brief summary of its key contents.');
            const vectorDocId = indexResult.document_id ?? null;
            const fileUrl = indexResult.storage_url ?? null;
            const aiSummary = indexResult.response ?? null;
            const updatedDoc = await prisma.matterDocument.update({
                where: { id: doc.id },
                data: {
                    vectorDocId,
                    vectorIndexed: !!vectorDocId,
                    fileUrl,
                    aiSummary,
                },
            });
            if (vectorDocId) {
                workspaceMemoryService
                    .appendDocumentToIndex(matterId, {
                    id: doc.id,
                    title,
                    type: docType,
                    vectorDocId,
                    aiSummary,
                })
                    .catch(err => logger.warn('Failed to append doc to memory index', { matterId, docId: doc.id, err }));
            }
            logger.info('MatterDocument uploaded and indexed', {
                lawyerId, matterId, docId: doc.id, vectorDocId,
            });
            return updatedDoc;
        }
        catch (indexError) {
            logger.error('RAG indexing failed for MatterDocument', {
                docId: doc.id, matterId, error: indexError,
            });
            await prisma.matterDocument.update({
                where: { id: doc.id },
                data: { vectorIndexed: false },
            });
            return {
                ...doc,
                vectorIndexed: false,
                _indexingError: 'Document uploaded but AI indexing failed. You can retry later.',
            };
        }
    }
    async listDocuments(lawyerId, matterId) {
        const matter = await prisma.matter.findFirst({
            where: { id: matterId, lawyerId },
            select: { id: true },
        });
        if (!matter) {
            throw new AppError('Matter not found.', 404, 'MATTER_NOT_FOUND');
        }
        const documents = await prisma.matterDocument.findMany({
            where: { matterId },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                title: true,
                type: true,
                originalName: true,
                fileUrl: true,
                vectorDocId: true,
                vectorIndexed: true,
                aiSummary: true,
                version: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        return documents;
    }
    async deleteDocument(lawyerId, matterId, docId) {
        const matter = await prisma.matter.findFirst({
            where: { id: matterId, lawyerId },
            select: { id: true },
        });
        if (!matter) {
            throw new AppError('Matter not found.', 404, 'MATTER_NOT_FOUND');
        }
        const doc = await prisma.matterDocument.findFirst({
            where: { id: docId, matterId },
        });
        if (!doc) {
            throw new AppError('Document not found.', 404, 'DOCUMENT_NOT_FOUND');
        }
        await prisma.matterDocument.delete({ where: { id: docId } });
        const memory = await prisma.workspaceMemory.findUnique({
            where: { matterId },
            select: { documentIndex: true },
        });
        if (memory && Array.isArray(memory.documentIndex)) {
            const filtered = memory.documentIndex.filter(d => d.id !== docId);
            await prisma.workspaceMemory.update({
                where: { matterId },
                data: { documentIndex: filtered },
            });
        }
        logger.info('MatterDocument deleted', { lawyerId, matterId, docId });
        return { message: 'Document deleted successfully.' };
    }
    resolveDocType(type) {
        const valid = ['UPLOADED', 'GENERATED', 'ORDER', 'EVIDENCE', 'CORRESPONDENCE'];
        if (type && valid.includes(type.toUpperCase())) {
            return type.toUpperCase();
        }
        return 'UPLOADED';
    }
}
export default new MatterDocumentService();
//# sourceMappingURL=matter-document.service.js.map