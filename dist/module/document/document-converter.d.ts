export type ConvertFormat = 'pdf' | 'docx' | 'txt';
export interface ConversionResult {
    buffer: Buffer;
    mimeType: string;
    extension: string;
}
declare class DocumentConverterService {
    /**
     * @param htmlContent
     * @param format
     * @returns            { buffer, mimeType, extension }
     */
    convert(htmlContent: string, format: ConvertFormat): Promise<ConversionResult>;
    mimeTypeFor(format: ConvertFormat): string;
}
declare const _default: DocumentConverterService;
export default _default;
//# sourceMappingURL=document-converter.d.ts.map