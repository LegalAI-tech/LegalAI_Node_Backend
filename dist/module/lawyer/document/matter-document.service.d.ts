declare class MatterDocumentService {
    uploadDocument(lawyerId: string, matterId: string, file: Express.Multer.File, input: {
        title?: string;
        type?: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        fileUrl: string | null;
        matterId: string;
        aiSummary: string | null;
        vectorIndexed: boolean;
        uploadedBy: string;
        type: import("@prisma/client").$Enums.MatterDocType;
        originalName: string | null;
        vectorDocId: string | null;
        extractedDates: import("@prisma/client/runtime/library").JsonValue | null;
        contentJson: import("@prisma/client/runtime/library").JsonValue | null;
        contentText: string | null;
        contentHtml: string | null;
        isEditable: boolean;
        lastEditedAt: Date | null;
        lastEditedBy: string | null;
        version: number;
        parentDocId: string | null;
    } | {
        vectorIndexed: boolean;
        _indexingError: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        fileUrl: string | null;
        matterId: string;
        aiSummary: string | null;
        uploadedBy: string;
        type: import("@prisma/client").$Enums.MatterDocType;
        originalName: string | null;
        vectorDocId: string | null;
        extractedDates: import("@prisma/client/runtime/library").JsonValue | null;
        contentJson: import("@prisma/client/runtime/library").JsonValue | null;
        contentText: string | null;
        contentHtml: string | null;
        isEditable: boolean;
        lastEditedAt: Date | null;
        lastEditedBy: string | null;
        version: number;
        parentDocId: string | null;
    }>;
    listDocuments(lawyerId: string, matterId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        fileUrl: string | null;
        aiSummary: string | null;
        vectorIndexed: boolean;
        type: import("@prisma/client").$Enums.MatterDocType;
        originalName: string | null;
        vectorDocId: string | null;
        version: number;
    }[]>;
    deleteDocument(lawyerId: string, matterId: string, docId: string): Promise<{
        message: string;
    }>;
    private resolveDocType;
}
declare const _default: MatterDocumentService;
export default _default;
//# sourceMappingURL=matter-document.service.d.ts.map